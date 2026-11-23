import { DEFAULT_PANTRY_STAPLES } from '../data/koreanIngredients';
import type {
  CookingLogEntry,
  FridgeIngredient,
  FridgePreferences,
  PantryStaple,
  Recipe,
  ShoppingListItem,
} from '../types/recipe';

const KEYS = {
  FRIDGE: 'fridge_chef_ingredients_v1',
  PANTRY: 'fridge_chef_pantry_v1',
  FAVORITES: 'fridge_chef_favorites_v1',
  LOGS: 'fridge_chef_logs_v1',
  SHOPPING: 'fridge_chef_shopping_v1',
  PREFS: 'fridge_chef_prefs_v1',
  THEME: 'fridge_chef_theme',
} as const;

export const DEFAULT_PREFERENCES: FridgePreferences = {
  servings: 2,
  timeLimit: '30분 이내',
  difficulty: '쉬움',
  diet: '제한 없음',
  tools: ['프라이팬', '냄비'],
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadFridgeIngredients(): FridgeIngredient[] {
  const existing = safeRead<FridgeIngredient[] | null>(KEYS.FRIDGE, null);
  if (existing !== null) return existing;

  // Initial starter sample so first-time users immediately see how fridge + expiry banner work
  const today = new Date();
  const plus2 = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10);
  const plus6 = new Date(today.getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const starter: FridgeIngredient[] = [
    {
      id: 'init-tofu',
      name: '두부',
      emoji: '🧈',
      category: '두부/콩',
      expiryDate: plus2,
      addedAt: today.toISOString(),
    },
    {
      id: 'init-egg',
      name: '달걀',
      emoji: '🥚',
      category: '달걀/유제품',
      expiryDate: plus6,
      addedAt: today.toISOString(),
    },
    {
      id: 'init-kimchi',
      name: '김치',
      emoji: '🥬',
      category: '김치/반찬',
      addedAt: today.toISOString(),
    },
    {
      id: 'init-green-onion',
      name: '대파',
      emoji: '🧅',
      category: '채소',
      expiryDate: plus2,
      addedAt: today.toISOString(),
    },
    {
      id: 'init-onion',
      name: '양파',
      emoji: '🧅',
      category: '채소',
      addedAt: today.toISOString(),
    },
  ];
  safeWrite(KEYS.FRIDGE, starter);
  return starter;
}

export function saveFridgeIngredients(items: FridgeIngredient[]): void {
  safeWrite(KEYS.FRIDGE, items);
}

export function loadPantryStaples(): PantryStaple[] {
  const saved = safeRead<PantryStaple[] | null>(KEYS.PANTRY, null);
  if (saved !== null) return saved;
  safeWrite(KEYS.PANTRY, DEFAULT_PANTRY_STAPLES);
  return DEFAULT_PANTRY_STAPLES;
}

export function savePantryStaples(items: PantryStaple[]): void {
  safeWrite(KEYS.PANTRY, items);
}

export function loadFavorites(): Recipe[] {
  return safeRead<Recipe[]>(KEYS.FAVORITES, []);
}

export function saveFavorites(items: Recipe[]): void {
  safeWrite(KEYS.FAVORITES, items);
}

export function loadCookingLogs(): CookingLogEntry[] {
  return safeRead<CookingLogEntry[]>(KEYS.LOGS, []);
}

export function saveCookingLogs(items: CookingLogEntry[]): void {
  safeWrite(KEYS.LOGS, items);
}

export function loadShoppingList(): ShoppingListItem[] {
  return safeRead<ShoppingListItem[]>(KEYS.SHOPPING, []);
}

export function saveShoppingList(items: ShoppingListItem[]): void {
  safeWrite(KEYS.SHOPPING, items);
}

export function loadPreferences(): FridgePreferences {
  return safeRead<FridgePreferences>(KEYS.PREFS, DEFAULT_PREFERENCES);
}

export function savePreferences(prefs: FridgePreferences): void {
  safeWrite(KEYS.PREFS, prefs);
}

export function getDaysUntilExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = expiryDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const targetMidnight = new Date(y, m - 1, d).getTime();
  return Math.round((targetMidnight - todayMidnight) / 86400000);
}

export function formatExpiryLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return `유통기한 ${Math.abs(days)}일 지남`;
  if (days === 0) return '오늘까지';
  return `${days}일 남음`;
}

export function loadTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(KEYS.THEME, theme);
  } catch {
    // ignore
  }
}
