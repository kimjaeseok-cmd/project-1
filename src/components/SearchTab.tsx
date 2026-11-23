import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Repeat,
  Search,
  ShoppingCart,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { POPULAR_MENU_SUGGESTIONS } from '../data/koreanIngredients';
import type {
  FridgeIngredient,
  MenuAnalysisResult,
  PantryStaple,
  Recipe,
  ShoppingListItem,
  SubstitutionMode,
} from '../types/recipe';
import { ErrorRetryCard, MenuAnalysisSkeleton } from './SkeletonCards';

interface SearchTabProps {
  fridgeItems: FridgeIngredient[];
  pantryStaples: PantryStaple[];
  defaultServings: number;
  onSelectRecipe: (recipe: Recipe) => void;
  onAddShoppingItems: (items: Omit<ShoppingListItem, 'id'>[]) => void;
  onShowToast: (message: string) => void;
}

export function SearchTab({
  fridgeItems,
  pantryStaples,
  defaultServings,
  onSelectRecipe,
  onAddShoppingItems,
  onShowToast,
}: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SubstitutionMode>('authentic');

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MenuAnalysisResult | null>(null);

  // Accepted substitution indices
  const [acceptedSubKeys, setAcceptedSubKeys] = useState<Record<string, boolean>>({});

  // Final substituted recipe generation state
  const [buildingRecipe, setBuildingRecipe] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const activeStapleNames = useMemo(
    () => pantryStaples.filter((s) => s.enabled).map((s) => s.name),
    [pantryStaples]
  );

  const fridgeNames = useMemo(() => fridgeItems.map((i) => i.name), [fridgeItems]);

  const runAnalyzeMenu = async (menuTitle: string, selectedMode: SubstitutionMode = mode) => {
    const clean = menuTitle.trim();
    if (!clean) {
      onShowToast('먹고 싶은 메뉴 이름을 입력해주세요.');
      return;
    }

    setQuery(clean);
    setAnalyzing(true);
    setAnalyzeError(null);
    setBuildError(null);

    try {
      const res = await fetch('/api/analyze-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuName: clean,
          fridgeIngredients: fridgeNames,
          pantryStaples: activeStapleNames,
          mode: selectedMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '메뉴 재료를 분석하지 못했습니다.');
      }

      const result = data as MenuAnalysisResult;
      setAnalysis(result);

      // Default accept all suggested substitutions
      const defaults: Record<string, boolean> = {};
      (result.substitutableIngredients || []).forEach((s) => {
        defaults[s.originalName] = true;
      });
      setAcceptedSubKeys(defaults);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : '메뉴 재료 분석 중 오류가 발생했습니다.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBuildSubstitutedRecipe = async () => {
    if (!analysis) return;
    setBuildingRecipe(true);
    setBuildError(null);

    try {
      const acceptedSubs = analysis.substitutableIngredients
        .filter((s) => acceptedSubKeys[s.originalName])
        .map((s) => ({
          originalName: s.originalName,
          substituteName: s.substituteName,
          ratioText: s.ratioText,
        }));

      const missingNames = analysis.missingIngredients.map((m) => m.name);

      const res = await fetch('/api/build-substituted-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuName: analysis.menuName,
          mode,
          servings: defaultServings,
          fridgeIngredients: fridgeNames,
          pantryStaples: activeStapleNames,
          acceptedSubstitutions: acceptedSubs,
          missingItems: missingNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '대체 레시피를 생성하지 못했습니다.');
      }
      if (data.recipe) {
        onSelectRecipe(data.recipe as Recipe);
      }
    } catch (err) {
      setBuildError(
        err instanceof Error ? err.message : '대체 레시피 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setBuildingRecipe(false);
    }
  };

  const handleAddMissingToShopping = () => {
    if (!analysis || !analysis.missingIngredients.length) return;
    onAddShoppingItems(
      analysis.missingIngredients.map((m) => ({
        name: m.name,
        amountText: m.amountText,
        checked: false,
        recipeTitle: analysis.menuName,
      }))
    );
    onShowToast('없는 재료를 장보기 목록에 담았습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 sm:p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            먹고 싶은 메뉴 검색
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            내 냉장고({fridgeItems.length}개)와 기본 재료({activeStapleNames.length}개)를 비교해
            부족한 재료 대체법과 비율을 알려드립니다.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('authentic');
              if (analysis) runAnalyzeMenu(analysis.menuName, 'authentic');
            }}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
              mode === 'authentic'
                ? 'border-[#1E6B52] dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">원래 맛에 가깝게</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              본연의 풍미와 식감을 살리는 정교한 대체 비율
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('simple');
              if (analysis) runAnalyzeMenu(analysis.menuName, 'simple');
            }}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
              mode === 'simple'
                ? 'border-[#1E6B52] dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              있는 재료로 최대한 간단하게
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              집에 있는 재료 우선 활용 · 생략 가능한 재료 최소화
            </p>
          </button>
        </div>

        {/* Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAnalyzeMenu(query);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="메뉴 이름 입력 (예: 김치찌개, 까르보나라)"
              aria-label="메뉴 이름 검색"
              className="w-full min-h-[48px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B52]"
            />
          </div>
          <button
            type="submit"
            disabled={analyzing}
            className="min-h-[48px] px-5 rounded-xl bg-[#1E6B52] hover:bg-[#185843] dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            {analyzing ? '분석 중...' : '재료 비교하기'}
          </button>
        </form>

        {/* Popular Menu Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400 mr-1">인기 검색:</span>
          {POPULAR_MENU_SUGGESTIONS.map((menu) => (
            <button
              key={menu}
              type="button"
              onClick={() => runAnalyzeMenu(menu)}
              className="min-h-[36px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-[#1E6B52] dark:hover:border-emerald-500 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/60 cursor-pointer"
            >
              {menu}
            </button>
          ))}
        </div>
      </section>

      {analyzeError && (
        <ErrorRetryCard
          title="메뉴 재료 비교에 실패했습니다"
          message={analyzeError}
          onRetry={() => runAnalyzeMenu(query)}
        />
      )}

      {analyzing ? (
        <MenuAnalysisSkeleton />
      ) : analysis ? (
        <div className="space-y-5">
          {/* Menu Summary Header */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                {analysis.emoji}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {analysis.menuName}
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    약 {analysis.estimatedMinutes}분 · {analysis.difficulty}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{analysis.description}</p>
              </div>
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">
              보유 {analysis.haveIngredients.length} · 대체{' '}
              {analysis.substitutableIngredients.length} · 부족 {analysis.missingIngredients.length}
            </div>
          </section>

          {/* 3-Column Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* 1. Have Ingredients */}
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  가지고 있는 재료
                </h3>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {analysis.haveIngredients.length}개
                </span>
              </div>

              {analysis.haveIngredients.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">
                  냉장고에 일치하는 재료가 아직 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {analysis.haveIngredients.map((item, idx) => (
                    <li
                      key={`${item.name}-${idx}`}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {item.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                        {item.amountText} · {item.source}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 2. Substitutable Ingredients */}
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <Repeat className="w-4 h-4 shrink-0" />
                  대체 가능한 재료
                </h3>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {analysis.substitutableIngredients.length}개
                </span>
              </div>

              {analysis.substitutableIngredients.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">
                  대체가 필요한 재료가 없습니다.
                </p>
              ) : (
                <ul className="space-y-3">
                  {analysis.substitutableIngredients.map((sub, idx) => {
                    const accepted = Boolean(acceptedSubKeys[sub.originalName]);
                    return (
                      <li
                        key={`${sub.originalName}-${idx}`}
                        className={`rounded-xl border p-3.5 space-y-2 transition-colors ${
                          accepted
                            ? 'border-blue-200 dark:border-blue-900/70 bg-blue-50/40 dark:bg-blue-950/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {sub.originalName}{' '}
                              <span className="text-xs font-normal text-zinc-500">
                                ({sub.originalAmount})
                              </span>
                            </p>
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 flex-wrap">
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              {sub.substituteName}
                              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                ({sub.substituteSource})
                              </span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setAcceptedSubKeys((prev) => ({
                                ...prev,
                                [sub.originalName]: !prev[sub.originalName],
                              }))
                            }
                            aria-label={`${sub.originalName} 대체 적용 토글`}
                            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                              accepted
                                ? 'bg-blue-600 text-white'
                                : 'border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            {accepted && <Check className="w-3.5 h-3.5" />}
                            {accepted ? '적용' : '미적용'}
                          </button>
                        </div>

                        <div className="rounded-lg bg-white/80 dark:bg-zinc-900/80 px-3 py-2 text-xs space-y-1">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                            대체 비율: {sub.ratioText}
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            맛/식감 변화: {sub.tasteTextureImpact}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 3. Missing / Essential Ingredients */}
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  없는 재료
                </h3>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {analysis.missingIngredients.length}개
                </span>
              </div>

              {analysis.missingIngredients.length === 0 ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 py-2">
                  대체 재료를 활용하면 추가 구매 없이 바로 만들 수 있어요!
                </p>
              ) : (
                <>
                  <ul className="space-y-2.5">
                    {analysis.missingIngredients.map((item, idx) => (
                      <li
                        key={`${item.name}-${idx}`}
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </span>
                            {item.isEssential && (
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                꼭 필요 (구매 권장)
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                            {item.amountText}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {item.reason}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={handleAddMissingToShopping}
                    className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    없는 재료 장보기 목록에 담기
                  </button>
                </>
              )}
            </section>
          </div>

          {buildError && (
            <ErrorRetryCard
              title="대체 레시피 생성에 실패했습니다"
              message={buildError}
              onRetry={handleBuildSubstitutedRecipe}
            />
          )}

          {/* Build Final Recipe CTA */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                대체 재료를 반영해 나만의 레시피로 만들어볼까요?
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                선택한 대체 재료 비율과 투입 타이밍이 조리 순서에 그대로 반영됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBuildSubstitutedRecipe}
              disabled={buildingRecipe}
              className="min-h-[52px] px-6 rounded-xl bg-[#1E6B52] hover:bg-[#185843] dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-60 text-white text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              {buildingRecipe
                ? '맞춤 레시피 만드는 중...'
                : '대체 재료 반영해서 레시피 만들기'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
