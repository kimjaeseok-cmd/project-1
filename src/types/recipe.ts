export type ActiveTab = 'fridge' | 'search' | 'my-recipes';

export type CookingTool =
  | '프라이팬'
  | '냄비'
  | '전자레인지'
  | '에어프라이어'
  | '오븐';

export type TimeLimitOption = '15분 이내' | '30분 이내' | '상관없음';
export type DifficultyOption = '쉬움' | '보통';
export type DietOption =
  | '제한 없음'
  | '채식'
  | '저염'
  | '다이어트'
  | '매운 것 제외';

export type SubstitutionMode = 'authentic' | 'simple';

export interface FridgeIngredient {
  id: string;
  name: string;
  emoji: string;
  category?: string;
  expiryDate?: string; // YYYY-MM-DD
  addedAt: string;
}

export interface PantryStaple {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
}

export interface RecognizedIngredientCandidate {
  id: string;
  name: string;
  emoji: string;
  category: string;
  quantityHint: string;
  suggestedExpiryDays: number;
  selected: boolean;
}

export interface RecipeIngredientItem {
  name: string;
  metricAmount: number; // per baseServings
  metricUnit: string; // g, ml, 개 등
  householdAmount: number; // per baseServings
  householdUnit: string; // 큰술, 작은술, 컵, 개, 적당량 등
  note?: string;
  inFridge: boolean;
  isSubstituted?: boolean;
  substituteNote?: string;
}

export interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  heatLevel: '약불' | '중불' | '강불' | '불 끄기' | '조리 불필요';
  durationMinutes: number;
  timerSeconds: number;
  visualCue: string;
  failTip: string;
}

export interface RecipeNutrition {
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  allergens: string[];
}

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  cookTimeMinutes: number;
  difficulty: '쉬움' | '보통';
  baseServings: number;
  matchPercent: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  usedUrgentIngredients: string[];
  substitutionSummary?: string;
  ingredients: RecipeIngredientItem[];
  steps: RecipeStep[];
  nutrition: RecipeNutrition;
  storageGuide: string;
  reheatGuide: string;
  leftoverIdeas: string[];
}

export interface MenuHaveItem {
  name: string;
  amountText: string;
  source: '냉장고' | '기본 재료';
}

export interface MenuMissingEssentialItem {
  name: string;
  amountText: string;
  isEssential: boolean;
  reason: string;
}

export interface MenuSubstitutableItem {
  originalName: string;
  originalAmount: string;
  substituteName: string;
  substituteSource: '냉장고' | '기본 재료' | '대체 추천';
  ratioText: string;
  tasteTextureImpact: string;
}

export interface MenuAnalysisResult {
  menuName: string;
  emoji: string;
  description: string;
  estimatedMinutes: number;
  difficulty: '쉬움' | '보통';
  haveIngredients: MenuHaveItem[];
  missingIngredients: MenuMissingEssentialItem[];
  substitutableIngredients: MenuSubstitutableItem[];
}

export interface CookingLogEntry {
  id: string;
  recipeId: string;
  recipeTitle: string;
  recipeEmoji: string;
  cookedAt: string; // YYYY-MM-DD
  rating: number; // 1..5
  memo: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amountText: string;
  checked: boolean;
  recipeTitle?: string;
}

export interface FridgePreferences {
  servings: number;
  timeLimit: TimeLimitOption;
  difficulty: DifficultyOption;
  diet: DietOption;
  tools: CookingTool[];
}
