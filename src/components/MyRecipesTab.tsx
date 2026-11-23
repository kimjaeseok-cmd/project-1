import { useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Copy,
  History,
  Plus,
  Settings2,
  ShoppingCart,
  Star,
  Trash2,
} from 'lucide-react';
import { findIngredientEmoji } from '../data/koreanIngredients';
import type {
  CookingLogEntry,
  PantryStaple,
  Recipe,
  ShoppingListItem,
} from '../types/recipe';

export type MyRecipesSubTab = 'favorites' | 'logs' | 'shopping' | 'pantry';

interface MyRecipesTabProps {
  subTab: MyRecipesSubTab;
  onChangeSubTab: (sub: MyRecipesSubTab) => void;
  favorites: Recipe[];
  cookingLogs: CookingLogEntry[];
  shoppingList: ShoppingListItem[];
  pantryStaples: PantryStaple[];
  onSelectRecipe: (recipe: Recipe) => void;
  onRemoveFavorite: (recipeId: string) => void;
  onDeleteLog: (logId: string) => void;
  onToggleShoppingItem: (itemId: string) => void;
  onDeleteShoppingItem: (itemId: string) => void;
  onClearCheckedShopping: () => void;
  onAddManualShoppingItem: (name: string, amountText: string) => void;
  onTogglePantryStaple: (stapleId: string) => void;
  onAddPantryStaple: (name: string) => void;
  onDeletePantryStaple: (stapleId: string) => void;
  onShowToast: (message: string) => void;
}

export function MyRecipesTab({
  subTab,
  onChangeSubTab,
  favorites,
  cookingLogs,
  shoppingList,
  pantryStaples,
  onSelectRecipe,
  onRemoveFavorite,
  onDeleteLog,
  onToggleShoppingItem,
  onDeleteShoppingItem,
  onClearCheckedShopping,
  onAddManualShoppingItem,
  onTogglePantryStaple,
  onAddPantryStaple,
  onDeletePantryStaple,
  onShowToast,
}: MyRecipesTabProps) {
  const [newShoppingName, setNewShoppingName] = useState('');
  const [newShoppingAmount, setNewShoppingAmount] = useState('');
  const [newStapleName, setNewStapleName] = useState('');

  const handleCopyShoppingList = async () => {
    const unchecked = shoppingList.filter((i) => !i.checked);
    const target = unchecked.length > 0 ? unchecked : shoppingList;
    if (!target.length) {
      onShowToast('복사할 장보기 항목이 없습니다.');
      return;
    }
    const text = target
      .map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.name}${i.amountText ? ` (${i.amountText})` : ''}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(`[냉장고 요리사 장보기 목록]\n${text}`);
      onShowToast('장보기 목록을 복사했습니다.');
    } catch {
      onShowToast('클립보드 복사에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            내 레시피 & 주방 관리
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            저장한 레시피, 요리 완료 기록, 장보기 목록, 기본 양념을 관리하세요.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 p-1">
          {[
            { id: 'favorites' as const, label: '즐겨찾기', icon: Bookmark, count: favorites.length },
            { id: 'logs' as const, label: '요리 기록', icon: History, count: cookingLogs.length },
            {
              id: 'shopping' as const,
              label: '장보기',
              icon: ShoppingCart,
              count: shoppingList.filter((i) => !i.checked).length,
            },
            { id: 'pantry' as const, label: '기본 재료', icon: Settings2, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeSubTab(tab.id)}
                className={`min-h-[40px] px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#1B1D1B] text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="tabular-nums text-[11px] opacity-75">({tab.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-view 1: Favorites */}
      {subTab === 'favorites' && (
        <section className="space-y-4">
          {favorites.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-10 text-center space-y-2">
              <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                즐겨찾기한 레시피가 아직 없습니다
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                마음에 드는 레시피 화면에서 하트 버튼을 누르면 오프라인에서도 바로 열 수 있게 저장됩니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((recipe) => (
                <div
                  key={recipe.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 flex flex-col justify-between gap-4"
                >
                  <button
                    type="button"
                    onClick={() => onSelectRecipe(recipe)}
                    className="text-left space-y-2.5 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                          {recipe.emoji}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-[#1E6B52] dark:group-hover:text-emerald-400 truncate">
                            {recipe.title}
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {recipe.cookTimeMinutes}분 · {recipe.difficulty}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                      {recipe.summary}
                    </p>
                  </button>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSelectRecipe(recipe)}
                      className="text-xs font-semibold text-[#1E6B52] dark:text-emerald-400 hover:underline min-h-[36px] cursor-pointer"
                    >
                      레시피 열기
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFavorite(recipe.id)}
                      aria-label={`${recipe.title} 즐겨찾기 삭제`}
                      className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sub-view 2: Cooking Logs */}
      {subTab === 'logs' && (
        <section className="space-y-4">
          {cookingLogs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-10 text-center space-y-2">
              <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                아직 요리 완료 기록이 없습니다
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                레시피 상세 화면 맨 아래의 ‘요리 완료 기록하기’로 날짜와 별점, 메모를 남겨보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cookingLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                        {log.recipeEmoji}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
                          {log.recipeTitle}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                          {log.cookedAt}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteLog(log.id)}
                      aria-label="요리 기록 삭제"
                      className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1" aria-label={`별점 ${log.rating}점`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= log.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-300 dark:text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {log.memo}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sub-view 3: Shopping Checklist */}
      {subTab === 'shopping' && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-5 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                장보기 체크리스트
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                레시피에서 담은 부족 재료와 직접 추가한 항목입니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                목록 복사
              </button>
              {shoppingList.some((i) => i.checked) && (
                <button
                  type="button"
                  onClick={onClearCheckedShopping}
                  className="min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-500 hover:text-red-600 cursor-pointer"
                >
                  완료 항목 비우기
                </button>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newShoppingName.trim()) return;
              onAddManualShoppingItem(newShoppingName.trim(), newShoppingAmount.trim());
              setNewShoppingName('');
              setNewShoppingAmount('');
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={newShoppingName}
              onChange={(e) => setNewShoppingName(e.target.value)}
              placeholder="살 재료 이름 (예: 생크림)"
              aria-label="살 재료 이름"
              className="flex-1 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 text-sm text-zinc-900 dark:text-zinc-100"
            />
            <input
              type="text"
              value={newShoppingAmount}
              onChange={(e) => setNewShoppingAmount(e.target.value)}
              placeholder="수량 (예: 200ml)"
              aria-label="수량"
              className="sm:w-36 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 text-sm text-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </form>

          {shoppingList.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
              장보기 목록이 비어 있습니다.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shoppingList.map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleShoppingItem(item.id)}
                    className="flex-1 min-h-[44px] flex items-center gap-3 text-left cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        item.checked
                          ? 'bg-[#1E6B52] border-[#1E6B52] text-white'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    >
                      {item.checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.checked
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {item.name}
                      </p>
                      {(item.amountText || item.recipeTitle) && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {[item.amountText, item.recipeTitle].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteShoppingItem(item.id)}
                    aria-label={`${item.name} 삭제`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Sub-view 4: Pantry Staples */}
      {subTab === 'pantry' && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              우리 집 기본 재료 (상비 양념)
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              켜져 있는 재료는 냉장고에 매번 입력하지 않아도 요리 추천과 대체 분석 시 보유 재료로
              자동 반영됩니다.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newStapleName.trim()) return;
              onAddPantryStaple(newStapleName.trim());
              setNewStapleName('');
            }}
            className="flex gap-2 max-w-md"
          >
            <input
              type="text"
              value={newStapleName}
              onChange={(e) => setNewStapleName(e.target.value)}
              placeholder="기본 재료 추가 (예: 카레가루, 치킨스톡)"
              aria-label="기본 재료 추가"
              className="flex-1 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 text-sm text-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {pantryStaples.map((staple) => (
              <div
                key={staple.id}
                className={`rounded-xl border flex items-center justify-between transition-colors ${
                  staple.enabled
                    ? 'border-[#1E6B52] dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 opacity-70'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onTogglePantryStaple(staple.id)}
                  className="flex-1 min-h-[48px] px-3 flex items-center gap-2 text-left cursor-pointer"
                >
                  <span className="text-lg">{staple.emoji || findIngredientEmoji(staple.name)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {staple.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {staple.enabled ? '보유 중' : '꺼짐'}
                    </p>
                  </div>
                </button>
                {!staple.id.startsWith('staple-') && (
                  <button
                    type="button"
                    onClick={() => onDeletePantryStaple(staple.id)}
                    aria-label={`${staple.name} 삭제`}
                    className="min-h-[44px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
