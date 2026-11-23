import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChefHat,
  Copy,
  Flame,
  Heart,
  Pause,
  Play,
  RotateCcw,
  ShoppingCart,
  Star,
  Timer,
  Utensils,
} from 'lucide-react';
import type { CookingLogEntry, Recipe, ShoppingListItem } from '../types/recipe';
import { formatCountdown, formatScaledAmount, playTimerChime } from '../utils/audioAndImage';
import { CookingModeModal } from './CookingModeModal';

interface RecipeDetailViewProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onBack: () => void;
  onAddShoppingItems: (items: Omit<ShoppingListItem, 'id'>[]) => void;
  onSaveCookingLog: (entry: Omit<CookingLogEntry, 'id'>) => void;
  onShowToast: (message: string) => void;
}

interface StepTimerState {
  remainingSec: number;
  running: boolean;
  done: boolean;
}

export function RecipeDetailView({
  recipe,
  isFavorite,
  onToggleFavorite,
  onBack,
  onAddShoppingItems,
  onSaveCookingLog,
  onShowToast,
}: RecipeDetailViewProps) {
  const [servings, setServings] = useState<number>(recipe.baseServings || 2);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [cookingModeStartStep, setCookingModeStartStep] = useState(0);

  // Step timers keyed by stepNumber
  const [timers, setTimers] = useState<Record<number, StepTimerState>>(() => {
    const initial: Record<number, StepTimerState> = {};
    recipe.steps.forEach((step) => {
      if (step.timerSeconds > 0) {
        initial[step.stepNumber] = {
          remainingSec: step.timerSeconds,
          running: false,
          done: false,
        };
      }
    });
    return initial;
  });

  // Reset timers if recipe changes
  useEffect(() => {
    setServings(recipe.baseServings || 2);
    const initial: Record<number, StepTimerState> = {};
    recipe.steps.forEach((step) => {
      if (step.timerSeconds > 0) {
        initial[step.stepNumber] = {
          remainingSec: step.timerSeconds,
          running: false,
          done: false,
        };
      }
    });
    setTimers(initial);
  }, [recipe]);

  // Global interval ticking any active step timers
  useEffect(() => {
    const hasRunning = Object.values(timers).some((t) => t.running);
    if (!hasRunning) return;
    const id = window.setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next: Record<number, StepTimerState> = { ...prev };
        Object.keys(next).forEach((keyStr) => {
          const key = Number(keyStr);
          const t = next[key];
          if (!t || !t.running) return;
          changed = true;
          if (t.remainingSec <= 1) {
            next[key] = { remainingSec: 0, running: false, done: true };
            playTimerChime();
            onShowToast(`${key}단계 타이머가 완료되었습니다!`);
          } else {
            next[key] = { ...t, remainingSec: t.remainingSec - 1 };
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timers, onShowToast]);

  const scaleFactor = useMemo(
    () => servings / Math.max(1, recipe.baseServings || 2),
    [servings, recipe.baseServings]
  );

  // Shopping checklist for missing ingredients
  const missingIngredientList = useMemo(
    () => recipe.ingredients.filter((ing) => !ing.inFridge),
    [recipe.ingredients]
  );

  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({});
  const [copiedShopping, setCopiedShopping] = useState(false);

  // Cooking log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRating, setLogRating] = useState(5);
  const [logMemo, setLogMemo] = useState('');

  const handleCopyShopping = async () => {
    const lines = missingIngredientList.map((ing) => {
      const metric = formatScaledAmount(ing.metricAmount * scaleFactor, ing.metricUnit);
      const household = formatScaledAmount(ing.householdAmount * scaleFactor, ing.householdUnit);
      const mark = shoppingChecked[ing.name] ? '[x]' : '[ ]';
      return `${mark} ${ing.name} (${metric} / ${household})`;
    });
    const text = `[${recipe.title} 장보기 목록 - ${servings}인분]\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShopping(true);
      onShowToast('장보기 목록을 클립보드에 복사했습니다.');
      setTimeout(() => setCopiedShopping(false), 2000);
    } catch {
      onShowToast('클립보드 복사에 실패했습니다.');
    }
  };

  const handleSaveMissingToShoppingTab = () => {
    if (!missingIngredientList.length) return;
    const payload = missingIngredientList.map((ing) => {
      const metric = formatScaledAmount(ing.metricAmount * scaleFactor, ing.metricUnit);
      const household = formatScaledAmount(ing.householdAmount * scaleFactor, ing.householdUnit);
      return {
        name: ing.name,
        amountText: `${metric} (${household})`,
        checked: Boolean(shoppingChecked[ing.name]),
        recipeTitle: recipe.title,
      };
    });
    onAddShoppingItems(payload);
    onShowToast('부족한 재료를 내 레시피 > 장보기 목록에 담았습니다.');
  };

  const handleSaveLog = () => {
    const today = new Date().toISOString().slice(0, 10);
    onSaveCookingLog({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeEmoji: recipe.emoji,
      cookedAt: today,
      rating: logRating,
      memo: logMemo.trim() || '맛있게 완성했어요!',
    });
    setShowLogModal(false);
    setLogMemo('');
    onShowToast('요리 완료 기록을 저장했습니다.');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Sticky Detail Sub-Bar */}
      <div className="sticky top-12 md:top-14 z-20 -mx-4 px-4 py-2.5 bg-[#F8F8F6]/90 dark:bg-[#121412]/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -ml-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleFavorite(recipe)}
            aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 저장'}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isFavorite
                ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isFavorite ? '저장됨' : '즐겨찾기'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCookingModeStartStep(0);
              setShowCookingMode(true);
            }}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#1E6B52] hover:bg-[#185843] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ChefHat className="w-4 h-4" />
            요리 모드
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 sm:p-7 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl shrink-0">
            {recipe.emoji}
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {recipe.title}
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {recipe.summary}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 pt-1 tabular-nums">
              <span>약 {recipe.cookTimeMinutes}분</span>
              <span aria-hidden="true">·</span>
              <span>난이도 {recipe.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#1E6B52] dark:text-emerald-400">
                재료 일치율 {recipe.matchPercent}%
              </span>
              <span aria-hidden="true">·</span>
              <span>1인분 {recipe.nutrition.caloriesKcal}kcal</span>
            </div>
          </div>
        </div>

        {recipe.substitutionSummary && (
          <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 p-3.5 text-sm text-emerald-900 dark:text-emerald-200">
            <span className="font-semibold">대체 재료 반영됨: </span>
            {recipe.substitutionSummary}
          </div>
        )}
      </section>

      {/* Main Two-Column Desktop Split: Left Ingredients + Shopping, Right Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ingredients & Shopping & Nutrition */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ingredients with Servings Slider */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">재료 준비</h2>
              <span className="text-sm font-semibold text-[#1E6B52] dark:text-emerald-400 tabular-nums">
                {servings}인분 기준
              </span>
            </div>

            {/* Servings Slider */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>인분 조절 슬라이더</span>
                <span className="tabular-nums">1인분 ~ 6인분</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                step={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                aria-label="인원수 조절"
                className="w-full accent-[#1E6B52] dark:accent-emerald-500 cursor-pointer h-6"
              />
              <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums px-0.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setServings(n)}
                    className={`min-w-[28px] min-h-[28px] rounded-md cursor-pointer ${
                      servings === n
                        ? 'text-[#1E6B52] dark:text-emerald-400 font-bold'
                        : 'hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients List */}
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recipe.ingredients.map((ing, idx) => {
                const metricStr = formatScaledAmount(ing.metricAmount * scaleFactor, ing.metricUnit);
                const householdStr = formatScaledAmount(
                  ing.householdAmount * scaleFactor,
                  ing.householdUnit
                );
                const showDual = metricStr !== householdStr;
                return (
                  <li key={`${ing.name}-${idx}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              ing.inFridge
                                ? 'text-zinc-900 dark:text-zinc-100'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {ing.name}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {ing.inFridge ? '보유' : '부족'}
                            {ing.isSubstituted ? ' · 대체 적용' : ''}
                          </span>
                        </div>
                        {(ing.note || ing.substituteNote) && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {ing.substituteNote || ing.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {metricStr}
                        </p>
                        {showDual && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">({householdStr})</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Missing Ingredients Shopping Checklist */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#1E6B52] dark:text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  부족한 재료 장보기
                </h2>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {missingIngredientList.length}개
              </span>
            </div>

            {missingIngredientList.length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                모든 재료가 냉장고와 기본 재료에 준비되어 있습니다.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {missingIngredientList.map((ing) => {
                    const metric = formatScaledAmount(ing.metricAmount * scaleFactor, ing.metricUnit);
                    const household = formatScaledAmount(
                      ing.householdAmount * scaleFactor,
                      ing.householdUnit
                    );
                    const checked = Boolean(shoppingChecked[ing.name]);
                    return (
                      <li key={ing.name}>
                        <button
                          type="button"
                          onClick={() =>
                            setShoppingChecked((prev) => ({
                              ...prev,
                              [ing.name]: !prev[ing.name],
                            }))
                          }
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-[#1E6B52] border-[#1E6B52] text-white'
                                  : 'border-zinc-300 dark:border-zinc-600'
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <span
                              className={`text-sm font-medium truncate ${
                                checked
                                  ? 'line-through text-zinc-400 dark:text-zinc-500'
                                  : 'text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {ing.name}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">
                            {metric} ({household})
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyShopping}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedShopping ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copiedShopping ? '복사됨' : '목록 복사'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMissingToShoppingTab}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    장보기에 담기
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Nutrition & Allergens (Reference Only) */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                영양 정보 (1인분)
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">참고용</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">열량</p>
                <p className="text-base font-bold font-mono-num text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {recipe.nutrition.caloriesKcal}
                </p>
                <p className="text-[11px] text-zinc-400">kcal</p>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">탄수화물</p>
                <p className="text-base font-bold font-mono-num text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {recipe.nutrition.carbsG}g
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">단백질</p>
                <p className="text-base font-bold font-mono-num text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {recipe.nutrition.proteinG}g
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">지방</p>
                <p className="text-base font-bold font-mono-num text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {recipe.nutrition.fatG}g
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                알레르기 유발 가능 재료 (참고용)
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {recipe.nutrition.allergens.length > 0
                  ? recipe.nutrition.allergens.join(', ')
                  : '특이 알레르기 유발 재료 정보 없음'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                ※ 위 영양 성분 및 알레르기 정보는 일반적인 식재료 평균치 기준의 참고용 안내이며 의학적·영양학적 조언이 아닙니다.
              </p>
            </div>
          </section>
        </div>

        {/* Right Column: Step-by-Step Cooking Cards + Storage & Log */}
        <div className="lg:col-span-7 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                단계별 조리 순서
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                총 {recipe.steps.length}단계
              </span>
            </div>

            <div className="space-y-4">
              {recipe.steps.map((step, index) => {
                const tState = timers[step.stepNumber];
                return (
                  <article
                    key={step.stepNumber}
                    className={`rounded-2xl border p-5 space-y-4 transition-colors ${
                      tState?.done
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#1E6B52] dark:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                          {step.stepNumber}
                        </span>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                          {step.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          {step.heatLevel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>약 {step.durationMinutes}분</span>
                      </div>
                    </div>

                    <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {step.instruction}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3 space-y-1">
                        <p className="text-xs font-semibold text-[#1E6B52] dark:text-emerald-400">
                          눈으로 확인할 상태
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">{step.visualCue}</p>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3 space-y-1">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          실패 방지 팁
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">{step.failTip}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {step.timerSeconds > 0 && tState ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTimers((prev) => {
                                const current = prev[step.stepNumber];
                                if (!current) return prev;
                                const nextSec =
                                  current.remainingSec === 0 ? step.timerSeconds : current.remainingSec;
                                return {
                                  ...prev,
                                  [step.stepNumber]: {
                                    remainingSec: nextSec,
                                    running: !current.running,
                                    done: false,
                                  },
                                };
                              });
                            }}
                            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                              tState.running
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : tState.done
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {tState.running ? (
                              <Pause className="w-4 h-4" />
                            ) : tState.done ? (
                              <Timer className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            <span className="font-mono-num">
                              {formatCountdown(tState.remainingSec)}
                            </span>
                            <span>
                              {tState.running ? '일시정지' : tState.done ? '완료!' : '타이머 시작'}
                            </span>
                          </button>

                          {(tState.remainingSec !== step.timerSeconds || tState.done) && (
                            <button
                              type="button"
                              onClick={() =>
                                setTimers((prev) => ({
                                  ...prev,
                                  [step.stepNumber]: {
                                    remainingSec: step.timerSeconds,
                                    running: false,
                                    done: false,
                                  },
                                }))
                              }
                              aria-label="타이머 초기화"
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCookingModeStartStep(index);
                          setShowCookingMode(true);
                        }}
                        className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#1E6B52] dark:hover:text-emerald-400 min-h-[44px] px-2 cursor-pointer"
                      >
                        이 단계부터 큰 화면 →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Storage, Reheat & Leftover Ideas */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#1E6B52] dark:text-emerald-400" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                보관 · 재가열 · 남은 재료 활용
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">보관법</p>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {recipe.storageGuide}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">재가열 방법</p>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {recipe.reheatGuide}
                </p>
              </div>
            </div>

            {recipe.leftoverIdeas.length > 0 && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  남은 재료 활용 아이디어
                </p>
                <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {recipe.leftoverIdeas.map((idea, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#1E6B52] dark:text-emerald-400 font-bold">·</span>
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Complete Cooking Log CTA */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                요리를 완성하셨나요?
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                별점과 한 줄 메모를 남기면 내 레시피 기록에 저장됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              요리 완료 기록하기
            </button>
          </div>
        </div>
      </div>

      {/* Cooking Completion Modal */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="요리 완료 기록"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1B1D1B] border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {recipe.emoji} {recipe.title} 완성 기록
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                오늘 요리는 어떠셨나요? 다음에 다시 만들 때 참고할 메모를 남겨보세요.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">별점</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setLogRating(star)}
                    aria-label={`${star}점`}
                    className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= logRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="cooking-log-memo"
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 block"
              >
                메모 (선택)
              </label>
              <textarea
                id="cooking-log-memo"
                rows={3}
                value={logMemo}
                onChange={(e) => setLogMemo(e.target.value)}
                placeholder="예: 간장을 반 스푼 줄이니 딱 좋았음, 다음엔 청양고추 추가하기"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1E6B52]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="min-h-[48px] rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveLog}
                className="min-h-[48px] rounded-xl bg-[#1E6B52] hover:bg-[#185843] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Hands-Free Cooking Mode */}
      {showCookingMode && (
        <CookingModeModal
          recipe={recipe}
          initialStepIndex={cookingModeStartStep}
          onClose={() => setShowCookingMode(false)}
        />
      )}
    </div>
  );
}
