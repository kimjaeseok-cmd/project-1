import { useCallback, useEffect, useState } from 'react';
import { BookHeart, Download, Moon, Refrigerator, Search, Sun } from 'lucide-react';
import { findIngredientEmoji } from './data/koreanIngredients';
import type {
  ActiveTab,
  CookingLogEntry,
  FridgeIngredient,
  FridgePreferences,
  PantryStaple,
  Recipe,
  ShoppingListItem,
} from './types/recipe';
import {
  loadCookingLogs,
  loadFavorites,
  loadFridgeIngredients,
  loadPantryStaples,
  loadPreferences,
  loadShoppingList,
  loadTheme,
  saveCookingLogs,
  saveFavorites,
  saveFridgeIngredients,
  savePantryStaples,
  savePreferences,
  saveShoppingList,
  saveTheme,
} from './utils/storage';
import { FridgeTab } from './components/FridgeTab';
import { SearchTab } from './components/SearchTab';
import { MyRecipesTab, type MyRecipesSubTab } from './components/MyRecipesTab';
import { RecipeDetailView } from './components/RecipeDetailView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('fridge');
  const [myRecipesSubTab, setMyRecipesSubTab] = useState<MyRecipesSubTab>('favorites');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [fridgeItems, setFridgeItems] = useState<FridgeIngredient[]>(() => loadFridgeIngredients());
  const [pantryStaples, setPantryStaples] = useState<PantryStaple[]>(() => loadPantryStaples());
  const [preferences, setPreferences] = useState<FridgePreferences>(() => loadPreferences());
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>(() => loadFavorites());
  const [cookingLogs, setCookingLogs] = useState<CookingLogEntry[]>(() => loadCookingLogs());
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => loadShoppingList());

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const handleUpdateFridge = (items: FridgeIngredient[]) => {
    setFridgeItems(items);
    saveFridgeIngredients(items);
  };

  const handleUpdatePreferences = (prefs: FridgePreferences) => {
    setPreferences(prefs);
    savePreferences(prefs);
  };

  const handleToggleFavorite = (recipe: Recipe) => {
    const exists = favorites.some((f) => f.id === recipe.id || f.title === recipe.title);
    const next = exists
      ? favorites.filter((f) => f.id !== recipe.id && f.title !== recipe.title)
      : [recipe, ...favorites];
    setFavorites(next);
    saveFavorites(next);
    showToast(exists ? '즐겨찾기에서 삭제했습니다.' : '즐겨찾기에 저장했습니다.');
  };

  const handleRemoveFavorite = (recipeId: string) => {
    const next = favorites.filter((f) => f.id !== recipeId);
    setFavorites(next);
    saveFavorites(next);
    showToast('즐겨찾기에서 삭제했습니다.');
  };

  const handleSaveCookingLog = (entry: Omit<CookingLogEntry, 'id'>) => {
    const next: CookingLogEntry[] = [
      { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ...cookingLogs,
    ];
    setCookingLogs(next);
    saveCookingLogs(next);
  };

  const handleDeleteLog = (logId: string) => {
    const next = cookingLogs.filter((l) => l.id !== logId);
    setCookingLogs(next);
    saveCookingLogs(next);
  };

  const handleAddShoppingItems = (items: Omit<ShoppingListItem, 'id'>[]) => {
    const existingNames = new Set(shoppingList.map((i) => i.name.trim()));
    const added: ShoppingListItem[] = [];
    items.forEach((item, idx) => {
      const clean = item.name.trim();
      if (!clean || existingNames.has(clean)) return;
      existingNames.add(clean);
      added.push({
        ...item,
        id: `shop-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      });
    });
    const next = [...added, ...shoppingList];
    setShoppingList(next);
    saveShoppingList(next);
  };

  const handleToggleShoppingItem = (itemId: string) => {
    const next = shoppingList.map((i) =>
      i.id === itemId ? { ...i, checked: !i.checked } : i
    );
    setShoppingList(next);
    saveShoppingList(next);
  };

  const handleDeleteShoppingItem = (itemId: string) => {
    const next = shoppingList.filter((i) => i.id !== itemId);
    setShoppingList(next);
    saveShoppingList(next);
  };

  const handleClearCheckedShopping = () => {
    const next = shoppingList.filter((i) => !i.checked);
    setShoppingList(next);
    saveShoppingList(next);
  };

  const handleTogglePantryStaple = (stapleId: string) => {
    const next = pantryStaples.map((s) =>
      s.id === stapleId ? { ...s, enabled: !s.enabled } : s
    );
    setPantryStaples(next);
    savePantryStaples(next);
  };

  const handleAddPantryStaple = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (pantryStaples.some((s) => s.name === clean)) {
      showToast(`'${clean}'은(는) 이미 기본 재료 목록에 있습니다.`);
      return;
    }
    const next: PantryStaple[] = [
      {
        id: `custom-staple-${Date.now()}`,
        name: clean,
        emoji: findIngredientEmoji(clean),
        enabled: true,
      },
      ...pantryStaples,
    ];
    setPantryStaples(next);
    savePantryStaples(next);
    showToast(`'${clean}'을(를) 기본 재료에 추가했습니다.`);
  };

  const handleDeletePantryStaple = (stapleId: string) => {
    const next = pantryStaples.filter((s) => s.id !== stapleId);
    setPantryStaples(next);
    savePantryStaples(next);
  };

  const isSelectedRecipeFavorite = selectedRecipe
    ? favorites.some((f) => f.id === selectedRecipe.id || f.title === selectedRecipe.title)
    : false;

  const navTabs: Array<{ id: ActiveTab; label: string; icon: typeof Refrigerator }> = [
    { id: 'fridge', label: '냉장고', icon: Refrigerator },
    { id: 'search', label: '메뉴 검색', icon: Search },
    { id: 'my-recipes', label: '내 레시피', icon: BookHeart },
  ];

  const handleTabSwitch = (tab: ActiveTab) => {
    setSelectedRecipe(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] dark:bg-[#121412] text-zinc-900 dark:text-zinc-100">
      {/* Top Bar Contract: 3 Zones (Wordmark - Desktop Nav Links - Theme Action) */}
      <header className="sticky top-0 z-30 h-12 md:h-14 bg-[#F8F8F6]/90 dark:bg-[#121412]/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <button
            type="button"
            onClick={() => handleTabSwitch('fridge')}
            className="text-base md:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            냉장고 요리사
          </button>

          {/* Zone 2: Clean Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="주 메뉴">
            {navTabs.map((tab) => {
              const isActive = !selectedRecipe && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`min-h-[44px] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    isActive
                      ? 'border-[#1E6B52] dark:border-emerald-400 text-[#1E6B52] dark:text-emerald-400'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Contextual Action (Theme Toggle) */}
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            className="min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1B1D1B] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="hidden sm:inline">{theme === 'light' ? '다크 모드' : '라이트 모드'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-5 pb-24 md:pb-12">
        {selectedRecipe ? (
          <RecipeDetailView
            recipe={selectedRecipe}
            isFavorite={isSelectedRecipeFavorite}
            onToggleFavorite={handleToggleFavorite}
            onBack={() => setSelectedRecipe(null)}
            onAddShoppingItems={handleAddShoppingItems}
            onSaveCookingLog={handleSaveCookingLog}
            onShowToast={showToast}
          />
        ) : activeTab === 'fridge' ? (
          <FridgeTab
            fridgeItems={fridgeItems}
            pantryStaples={pantryStaples}
            preferences={preferences}
            recommendations={recommendations}
            onUpdateFridge={handleUpdateFridge}
            onUpdatePreferences={handleUpdatePreferences}
            onSetRecommendations={setRecommendations}
            onSelectRecipe={(recipe) => {
              setSelectedRecipe(recipe);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPantrySettings={() => {
              setMyRecipesSubTab('pantry');
              setActiveTab('my-recipes');
            }}
            onShowToast={showToast}
          />
        ) : activeTab === 'search' ? (
          <SearchTab
            fridgeItems={fridgeItems}
            pantryStaples={pantryStaples}
            defaultServings={preferences.servings}
            onSelectRecipe={(recipe) => {
              setSelectedRecipe(recipe);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAddShoppingItems={handleAddShoppingItems}
            onShowToast={showToast}
          />
        ) : (
          <MyRecipesTab
            subTab={myRecipesSubTab}
            onChangeSubTab={setMyRecipesSubTab}
            favorites={favorites}
            cookingLogs={cookingLogs}
            shoppingList={shoppingList}
            pantryStaples={pantryStaples}
            onSelectRecipe={(recipe) => {
              setSelectedRecipe(recipe);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRemoveFavorite={handleRemoveFavorite}
            onDeleteLog={handleDeleteLog}
            onToggleShoppingItem={handleToggleShoppingItem}
            onDeleteShoppingItem={handleDeleteShoppingItem}
            onClearCheckedShopping={handleClearCheckedShopping}
            onAddManualShoppingItem={(name, amountText) =>
              handleAddShoppingItems([{ name, amountText, checked: false }])
            }
            onTogglePantryStaple={handleTogglePantryStaple}
            onAddPantryStaple={handleAddPantryStaple}
            onDeletePantryStaple={handleDeletePantryStaple}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Quiet Footer with Single-File index.html Download */}
      {typeof window !== 'undefined' && window.location.protocol !== 'file:' && (
        <footer className="max-w-6xl w-full mx-auto px-4 pb-24 md:pb-8 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-200/70 dark:border-zinc-800/70">
          <span>냉장고 요리사 · 한국 가정식 맞춤 요리 도우미</span>
          <a
            href="/api/download-html"
            download="index.html"
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            업로드용 index.html 내려받기
          </a>
        </footer>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold shadow-lg whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}

      {/* Mobile Fixed Bottom 3-Tab Navigation Bar */}
      <nav
        aria-label="하단 탭 내비게이션"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1B1D1B]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 pb-safe"
      >
        <div className="grid grid-cols-3 h-[60px]">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !selectedRecipe;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#1E6B52] dark:text-emerald-400 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 font-medium'
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 1.9} />
                <span className="text-[11px] tracking-tight whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
