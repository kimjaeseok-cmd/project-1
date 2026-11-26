import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { findIngredientEmoji, KOREAN_INGREDIENT_CATALOG } from '../data/koreanIngredients';
import type {
  CookingTool,
  DietOption,
  DifficultyOption,
  FridgeIngredient,
  FridgePreferences,
  PantryStaple,
  Recipe,
  RecognizedIngredientCandidate,
  TimeLimitOption,
} from '../types/recipe';
import { apiFetch } from '../utils/api';
import { compressImageForUpload } from '../utils/audioAndImage';
import { formatExpiryLabel, getDaysUntilExpiry } from '../utils/storage';
import {
  ErrorRetryCard,
  PhotoRecognitionSkeleton,
  RecipeListSkeleton,
} from './SkeletonCards';

interface FridgeTabProps {
  fridgeItems: FridgeIngredient[];
  pantryStaples: PantryStaple[];
  preferences: FridgePreferences;
  recommendations: Recipe[];
  onUpdateFridge: (items: FridgeIngredient[]) => void;
  onUpdatePreferences: (prefs: FridgePreferences) => void;
  onSetRecommendations: (recipes: Recipe[]) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenPantrySettings: () => void;
  onShowToast: (message: string) => void;
}

const TIME_OPTIONS: TimeLimitOption[] = ['15분 이내', '30분 이내', '상관없음'];
const DIFFICULTY_OPTIONS: DifficultyOption[] = ['쉬움', '보통'];
const DIET_OPTIONS: DietOption[] = [
  '제한 없음',
  '채식',
  '저염',
  '다이어트',
  '매운 것 제외',
];
const TOOL_OPTIONS: CookingTool[] = [
  '프라이팬',
  '냄비',
  '전자레인지',
  '에어프라이어',
  '오븐',
];

export function FridgeTab({
  fridgeItems,
  pantryStaples,
  preferences,
  recommendations,
  onUpdateFridge,
  onUpdatePreferences,
  onSetRecommendations,
  onSelectRecipe,
  onOpenPantrySettings,
  onShowToast,
}: FridgeTabProps) {
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Expiry/edit drawer for selected fridge ingredient
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Photo upload & recognition state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [lastImagePayload, setLastImagePayload] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [recognizingPhoto, setRecognizingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [recognizedCandidates, setRecognizedCandidates] = useState<
    RecognizedIngredientCandidate[]
  >([]);

  // Recipe recommendation request state
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [lastPriorityMode, setLastPriorityMode] = useState(false);

  const activeStaples = useMemo(
    () => pantryStaples.filter((s) => s.enabled),
    [pantryStaples]
  );

  // Urgent expiry items (<= 3 days)
  const urgentItems = useMemo(() => {
    return fridgeItems
      .map((item) => ({
        item,
        days: getDaysUntilExpiry(item.expiryDate),
      }))
      .filter((entry): entry is { item: FridgeIngredient; days: number } => entry.days !== null && entry.days <= 3)
      .sort((a, b) => a.days - b.days);
  }, [fridgeItems]);

  // Autocomplete filtered list
  const suggestions = useMemo(() => {
    const q = inputText.trim().toLowerCase();
    const existingNames = new Set(fridgeItems.map((i) => i.name.trim()));
    const pool = KOREAN_INGREDIENT_CATALOG.filter((c) => !existingNames.has(c.name));
    if (!q) return pool.slice(0, 8);
    return pool.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [inputText, fridgeItems]);

  const addIngredientByName = (rawName: string, defaultExpiryDays?: number) => {
    const clean = rawName.trim();
    if (!clean) return;
    if (fridgeItems.some((i) => i.name.trim() === clean)) {
      onShowToast(`'${clean}'은(는) 이미 냉장고에 있습니다.`);
      setInputText('');
      return;
    }

    const catalogMatch = KOREAN_INGREDIENT_CATALOG.find((c) => c.name === clean);
    const expiryDays = defaultExpiryDays ?? catalogMatch?.defaultExpiryDays;
    const expiryDate =
      typeof expiryDays === 'number'
        ? new Date(Date.now() + expiryDays * 86400000).toISOString().slice(0, 10)
        : undefined;

    const newItem: FridgeIngredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      emoji: catalogMatch?.emoji ?? findIngredientEmoji(clean),
      category: catalogMatch?.category,
      expiryDate,
      addedAt: new Date().toISOString(),
    };
    onUpdateFridge([newItem, ...fridgeItems]);
    setInputText('');
    setShowSuggestions(false);
  };

  const removeFridgeItem = (id: string) => {
    onUpdateFridge(fridgeItems.filter((item) => item.id !== id));
    if (editingItemId === id) setEditingItemId(null);
  };

  const setItemExpiryOffset = (id: string, daysFromNow: number | null) => {
    const nextDate =
      daysFromNow === null
        ? undefined
        : new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
    onUpdateFridge(
      fridgeItems.map((item) => (item.id === id ? { ...item, expiryDate: nextDate } : item))
    );
  };

  const setItemExactExpiryDate = (id: string, dateStr: string) => {
    onUpdateFridge(
      fridgeItems.map((item) =>
        item.id === id ? { ...item, expiryDate: dateStr || undefined } : item
      )
    );
  };

  const saveEditedName = (id: string) => {
    const clean = editNameValue.trim();
    if (!clean) return;
    onUpdateFridge(
      fridgeItems.map((item) =>
        item.id === id
          ? { ...item, name: clean, emoji: findIngredientEmoji(clean) }
          : item
      )
    );
    setEditingItemId(null);
  };

  // Photo Recognition API call
  const runPhotoRecognition = async (payload: { base64: string; mimeType: string }) => {
    setRecognizingPhoto(true);
    setPhotoError(null);
    setRecognizedCandidates([]);

    try {
      const res = await apiFetch('/api/recognize-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payload.base64,
          mimeType: payload.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '식재료를 인식하지 못했습니다.');
      }

      const items = (data.ingredients || []) as Array<{
        name: string;
        emoji: string;
        category: string;
        quantityHint: string;
        suggestedExpiryDays: number;
      }>;

      if (!items.length) {
        setPhotoError('사진에서 식재료를 찾지 못했습니다. 재료가 잘 보이게 다시 찍어보세요.');
        return;
      }

      setRecognizedCandidates(
        items.map((item, idx) => ({
          id: `cand-${Date.now()}-${idx}`,
          name: item.name,
          emoji: item.emoji || findIngredientEmoji(item.name),
          category: item.category || '기타',
          quantityHint: item.quantityHint || '',
          suggestedExpiryDays: item.suggestedExpiryDays || 5,
          selected: true,
        }))
      );
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '이미지 분석 중 오류가 발생했습니다.');
    } finally {
      setRecognizingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImageForUpload(file);
      setPhotoPreviewUrl(compressed.previewUrl);
      const payload = { base64: compressed.base64, mimeType: compressed.mimeType };
      setLastImagePayload(payload);
      await runPhotoRecognition(payload);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '사진을 읽을 수 없습니다.');
    }
  };

  const confirmRecognizedCandidates = () => {
    const chosen = recognizedCandidates.filter((c) => c.selected && c.name.trim());
    if (!chosen.length) {
      onShowToast('추가할 재료를 선택해주세요.');
      return;
    }

    const existingNames = new Set(fridgeItems.map((i) => i.name.trim()));
    const toAdd: FridgeIngredient[] = [];
    chosen.forEach((cand) => {
      const clean = cand.name.trim();
      if (existingNames.has(clean)) return;
      existingNames.add(clean);
      const expiryDate = new Date(
        Date.now() + Math.max(1, cand.suggestedExpiryDays) * 86400000
      )
        .toISOString()
        .slice(0, 10);
      toAdd.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: clean,
        emoji: cand.emoji || findIngredientEmoji(clean),
        category: cand.category,
        expiryDate,
        addedAt: new Date().toISOString(),
      });
    });

    onUpdateFridge([...toAdd, ...fridgeItems]);
    setRecognizedCandidates([]);
    setPhotoPreviewUrl(null);
    onShowToast(`${toAdd.length}개 재료를 냉장고에 추가했습니다.`);
  };

  // Recipe Recommendation API call
  const handleRecommendRecipes = async (prioritizeUrgent = false) => {
    if (!fridgeItems.length) {
      onShowToast('냉장고에 최소 1개 이상의 재료를 넣어주세요.');
      return;
    }

    setLastPriorityMode(prioritizeUrgent);
    setLoadingRecipes(true);
    setRecipesError(null);

    try {
      const priorityNames = urgentItems.map((u) => u.item.name);
      const res = await apiFetch('/api/recommend-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: fridgeItems.map((i) => ({
            name: i.name,
            daysUntilExpiry: getDaysUntilExpiry(i.expiryDate),
          })),
          pantryStaples: activeStaples.map((s) => s.name),
          priorityIngredients: prioritizeUrgent ? priorityNames : priorityNames.slice(0, 2),
          preferences,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '요리 추천을 받아오지 못했습니다.');
      }
      onSetRecommendations(data.recipes || []);
    } catch (err) {
      setRecipesError(
        err instanceof Error ? err.message : '요리 추천 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setLoadingRecipes(false);
    }
  };

  const toggleTool = (tool: CookingTool) => {
    const exists = preferences.tools.includes(tool);
    const nextTools = exists
      ? preferences.tools.filter((t) => t !== tool)
      : [...preferences.tools, tool];
    onUpdatePreferences({ ...preferences, tools: nextTools });
  };

  const editingItem = fridgeItems.find((i) => i.id === editingItemId) ?? null;

  return (
    <div className="space-y-6">
      {/* Urgent Expiry Banner */}
      {urgentItems.length > 0 && (
        <section
          aria-label="유통기한 임박 알림"
          className="rounded-2xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/35 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100">
                이 재료부터 쓰세요
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {urgentItems
                  .map(({ item, days }) => `${item.emoji} ${item.name}(${formatExpiryLabel(days)})`)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRecommendRecipes(true)}
            disabled={loadingRecipes}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            임박 재료 우선 추천받기
          </button>
        </section>
      )}

      {/* Desktop Two-Column Split: Left = Fridge Ingredients & Conditions, Right = Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ingredients Input + Conditions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Ingredient Input Card */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  우리 집 냉장고
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  현재 {fridgeItems.length}개 재료 · 기본 양념 {activeStaples.length}개 적용 중
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPantrySettings}
                className="min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                기본 재료 설정
              </button>
            </div>

            {/* Method A: Photo Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={recognizingPhoto}
                className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#1E6B52] dark:hover:border-emerald-500 bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 flex items-center justify-center gap-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                <Camera className="w-5 h-5 text-[#1E6B52] dark:text-emerald-400" />
                <span>
                  {recognizingPhoto
                    ? '사진에서 재료 찾는 중...'
                    : '냉장고 · 식재료 사진으로 한 번에 추가'}
                </span>
              </button>
            </div>

            {/* Photo Recognition Skeleton / Error / Review Box */}
            {recognizingPhoto && <PhotoRecognitionSkeleton />}
            {photoError && lastImagePayload && (
              <ErrorRetryCard
                title="사진 인식 실패"
                message={photoError}
                onRetry={() => runPhotoRecognition(lastImagePayload)}
              />
            )}

            {recognizedCandidates.length > 0 && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {photoPreviewUrl && (
                      <img
                        src={photoPreviewUrl}
                        alt="업로드된 식재료 사진"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                    )}
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        인식된 재료 확인 및 수정
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        이름을 고치거나 불필요한 항목을 체크 해제하세요
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecognizedCandidates([])}
                    aria-label="인식 결과 닫기"
                    className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {recognizedCandidates.map((cand) => (
                    <li
                      key={cand.id}
                      className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1B1D1B] border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setRecognizedCandidates((prev) =>
                            prev.map((c) =>
                              c.id === cand.id ? { ...c, selected: !c.selected } : c
                            )
                          )
                        }
                        aria-label={`${cand.name} 선택`}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                          cand.selected
                            ? 'bg-[#1E6B52] border-[#1E6B52] text-white'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {cand.selected && <Check className="w-4 h-4" />}
                      </button>
                      <span className="text-lg shrink-0">{cand.emoji}</span>
                      <input
                        type="text"
                        value={cand.name}
                        onChange={(e) =>
                          setRecognizedCandidates((prev) =>
                            prev.map((c) =>
                              c.id === cand.id ? { ...c, name: e.target.value } : c
                            )
                          )
                        }
                        aria-label="인식된 재료 이름 수정"
                        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none border-b border-transparent focus:border-[#1E6B52] py-1"
                      />
                      {cand.quantityHint && (
                        <span className="text-xs text-zinc-400 shrink-0">{cand.quantityHint}</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setRecognizedCandidates((prev) => prev.filter((c) => c.id !== cand.id))
                        }
                        aria-label={`${cand.name} 삭제`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={confirmRecognizedCandidates}
                  className="w-full min-h-[44px] rounded-xl bg-[#1E6B52] hover:bg-[#185843] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  선택한 재료 냉장고에 넣기
                </button>
              </div>
            )}

            {/* Method B: Direct Input with Autocomplete */}
            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addIngredientByName(inputText);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="재료 입력 (예: 대파, 두부, 삼겹살)"
                  aria-label="식재료 직접 입력"
                  className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B52]"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] shadow-lg overflow-hidden">
                  <div className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    추천 재료 선택
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-1.5">
                    {suggestions.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addIngredientByName(item.name, item.defaultExpiryDays);
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-lg text-left text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 truncate cursor-pointer"
                      >
                        <span>{item.emoji}</span>
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fridge Ingredient Chips */}
            {fridgeItems.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-6 text-center space-y-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  아직 냉장고가 비어 있습니다
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  사진을 올리거나 재료를 입력해 추가해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {fridgeItems.map((item) => {
                    const days = getDaysUntilExpiry(item.expiryDate);
                    const expiryText = formatExpiryLabel(days);
                    const isUrgent = days !== null && days <= 3;
                    const isSelectedForEdit = editingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`inline-flex items-center rounded-xl border transition-colors ${
                          isSelectedForEdit
                            ? 'border-[#1E6B52] dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                            : isUrgent
                              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelectedForEdit) {
                              setEditingItemId(null);
                            } else {
                              setEditingItemId(item.id);
                              setEditNameValue(item.name);
                            }
                          }}
                          className="min-h-[40px] pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 cursor-pointer"
                          title="눌러서 이름 수정 또는 유통기한 설정"
                        >
                          <span>{item.emoji}</span>
                          <span>{item.name}</span>
                          {expiryText && (
                            <span
                              className={`text-xs tabular-nums ${
                                isUrgent
                                  ? 'text-amber-700 dark:text-amber-400 font-semibold'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              · {expiryText}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFridgeItem(item.id)}
                          aria-label={`${item.name} 삭제`}
                          className="min-h-[40px] min-w-[36px] pr-1 flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  재료를 누르면 이름 수정과 유통기한 설정을 할 수 있습니다.
                </p>
              </div>
            )}

            {/* Inline Editor for Selected Chip */}
            {editingItem && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    재료 정보 & 유통기한 설정
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingItemId(null)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    닫기
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    aria-label="재료 이름 수정"
                    className="flex-1 min-h-[40px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] px-3 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => saveEditedName(editingItem.id)}
                    className="min-h-[40px] px-3.5 rounded-lg bg-[#1E6B52] text-white text-xs font-semibold cursor-pointer"
                  >
                    이름 저장
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>유통기한 빠른 설정</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '오늘까지', days: 0 },
                      { label: '2일 남음', days: 2 },
                      { label: '5일 남음', days: 5 },
                      { label: '기한 없음', days: null },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setItemExpiryOffset(editingItem.id, preset.days)}
                        className="min-h-[36px] px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <input
                      type="date"
                      value={editingItem.expiryDate ?? ''}
                      onChange={(e) => setItemExactExpiryDate(editingItem.id, e.target.value)}
                      aria-label="유통기한 날짜 선택"
                      className="min-h-[36px] px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] text-xs text-zinc-700 dark:text-zinc-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Cooking Conditions Card */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">요리 조건 선택</h2>

            {/* Servings & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                  인원수
                </span>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({
                        ...preferences,
                        servings: Math.max(1, preferences.servings - 1),
                      })
                    }
                    aria-label="인원수 줄이기"
                    className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold tabular-nums">{preferences.servings}인분</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({
                        ...preferences,
                        servings: Math.min(6, preferences.servings + 1),
                      })
                    }
                    aria-label="인원수 늘리기"
                    className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                  난이도
                </span>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onUpdatePreferences({ ...preferences, difficulty: opt })}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        preferences.difficulty === opt
                          ? 'bg-white dark:bg-[#1B1D1B] text-zinc-900 dark:text-zinc-50 shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Limit */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                조리 시간
              </span>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onUpdatePreferences({ ...preferences, timeLimit: opt })}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      preferences.timeLimit === opt
                        ? 'bg-white dark:bg-[#1B1D1B] text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Diet */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                식단 조건
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DIET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onUpdatePreferences({ ...preferences, diet: opt })}
                    className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      preferences.diet === opt
                        ? 'border-[#1E6B52] dark:border-emerald-500 bg-[#1E6B52] dark:bg-emerald-600 text-white'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                사용 가능한 도구
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TOOL_OPTIONS.map((tool) => {
                  const active = preferences.tools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => handleRecommendRecipes(false)}
              disabled={loadingRecipes}
              className="w-full min-h-[52px] rounded-xl bg-[#1E6B52] hover:bg-[#185843] dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-60 text-white text-base font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              {loadingRecipes ? '맞춤 요리 찾는 중...' : '요리 추천받기'}
            </button>
          </section>
        </div>

        {/* Right Column: Recipe Recommendations */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              오늘 만들 수 있는 추천 메뉴
            </h2>
            {recommendations.length > 0 && !loadingRecipes && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {recommendations.length}개 메뉴
              </span>
            )}
          </div>

          {recipesError && (
            <ErrorRetryCard
              title="요리 추천을 불러오지 못했습니다"
              message={recipesError}
              onRetry={() => handleRecommendRecipes(lastPriorityMode)}
            />
          )}

          {loadingRecipes ? (
            <RecipeListSkeleton />
          ) : recommendations.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-8 sm:p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">
                <UtensilsCrossed className="w-7 h-7 text-zinc-400" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  냉장고 재료로 맞춤 레시피를 받아보세요
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  왼쪽에서 재료를 확인하고 조건을 고른 뒤 ‘요리 추천받기’를 누르면 바로 만들 수 있는
                  메뉴 4가지를 알려드립니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => onSelectRecipe(recipe)}
                  className="text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] hover:border-[#1E6B52] dark:hover:border-emerald-500 p-5 flex flex-col justify-between gap-4 transition-colors group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                          {recipe.emoji}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-[#1E6B52] dark:group-hover:text-emerald-400 truncate">
                            {recipe.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.cookTimeMinutes}분
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{recipe.difficulty}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#1E6B52] dark:text-emerald-400">
                              일치율 {recipe.matchPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E6B52] shrink-0 mt-1" />
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2">
                      {recipe.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1 text-xs">
                    {recipe.usedUrgentIngredients.length > 0 && (
                      <p className="text-amber-700 dark:text-amber-400 font-medium">
                        임박 재료 활용: {recipe.usedUrgentIngredients.join(', ')}
                      </p>
                    )}
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {recipe.missingIngredients.length > 0
                        ? `부족한 재료: ${recipe.missingIngredients.join(', ')}`
                        : '모든 재료 보유 중'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
