import type { PantryStaple } from '../types/recipe';

export interface KoreanIngredientCatalogItem {
  name: string;
  emoji: string;
  category: string;
  defaultExpiryDays?: number;
}

export const KOREAN_INGREDIENT_CATALOG: KoreanIngredientCatalogItem[] = [
  { name: '대파', emoji: '🧅', category: '채소', defaultExpiryDays: 7 },
  { name: '양파', emoji: '🧅', category: '채소', defaultExpiryDays: 14 },
  { name: '마늘', emoji: '🧄', category: '채소', defaultExpiryDays: 14 },
  { name: '청양고추', emoji: '🌶️', category: '채소', defaultExpiryDays: 7 },
  { name: '애호박', emoji: '🥒', category: '채소', defaultExpiryDays: 5 },
  { name: '감자', emoji: '🥔', category: '채소', defaultExpiryDays: 14 },
  { name: '당근', emoji: '🥕', category: '채소', defaultExpiryDays: 10 },
  { name: '무', emoji: '🥬', category: '채소', defaultExpiryDays: 10 },
  { name: '배추', emoji: '🥬', category: '채소', defaultExpiryDays: 7 },
  { name: '양배추', emoji: '🥬', category: '채소', defaultExpiryDays: 7 },
  { name: '시금치', emoji: '🥬', category: '채소', defaultExpiryDays: 3 },
  { name: '콩나물', emoji: '🌱', category: '채소', defaultExpiryDays: 3 },
  { name: '숙주', emoji: '🌱', category: '채소', defaultExpiryDays: 2 },
  { name: '부추', emoji: '🌿', category: '채소', defaultExpiryDays: 3 },
  { name: '깻잎', emoji: '🌿', category: '채소', defaultExpiryDays: 4 },
  { name: '상추', emoji: '🥬', category: '채소', defaultExpiryDays: 3 },
  { name: '오이', emoji: '🥒', category: '채소', defaultExpiryDays: 5 },
  { name: '파프리카', emoji: '🫑', category: '채소', defaultExpiryDays: 7 },
  { name: '브로콜리', emoji: '🥦', category: '채소', defaultExpiryDays: 5 },
  { name: '방울토마토', emoji: '🍅', category: '채소', defaultExpiryDays: 6 },
  { name: '토마토', emoji: '🍅', category: '채소', defaultExpiryDays: 5 },
  { name: '새송이버섯', emoji: '🍄', category: '버섯', defaultExpiryDays: 5 },
  { name: '팽이버섯', emoji: '🍄', category: '버섯', defaultExpiryDays: 4 },
  { name: '표고버섯', emoji: '🍄', category: '버섯', defaultExpiryDays: 6 },
  { name: '김치', emoji: '🥬', category: '김치/반찬', defaultExpiryDays: 30 },
  { name: '묵은지', emoji: '🥬', category: '김치/반찬', defaultExpiryDays: 45 },
  { name: '두부', emoji: '🧈', category: '두부/콩', defaultExpiryDays: 3 },
  { name: '순두부', emoji: '🧈', category: '두부/콩', defaultExpiryDays: 3 },
  { name: '달걀', emoji: '🥚', category: '달걀/유제품', defaultExpiryDays: 10 },
  { name: '우유', emoji: '🥛', category: '달걀/유제품', defaultExpiryDays: 4 },
  { name: '버터', emoji: '🧈', category: '달걀/유제품', defaultExpiryDays: 30 },
  { name: '슬라이스치즈', emoji: '🧀', category: '달걀/유제품', defaultExpiryDays: 14 },
  { name: '모짜렐라치즈', emoji: '🧀', category: '달걀/유제품', defaultExpiryDays: 14 },
  { name: '파마산치즈', emoji: '🧀', category: '달걀/유제품', defaultExpiryDays: 45 },
  { name: '생크림', emoji: '🥛', category: '달걀/유제품', defaultExpiryDays: 4 },
  { name: '플레인요거트', emoji: '🥣', category: '달걀/유제품', defaultExpiryDays: 5 },
  { name: '삼겹살', emoji: '🥓', category: '육류', defaultExpiryDays: 3 },
  { name: '돼지고기 앞다리살', emoji: '🥩', category: '육류', defaultExpiryDays: 3 },
  { name: '대패삼겹살', emoji: '🥓', category: '육류', defaultExpiryDays: 14 },
  { name: '다진 돼지고기', emoji: '🍖', category: '육류', defaultExpiryDays: 2 },
  { name: '소고기 불고기용', emoji: '🥩', category: '육류', defaultExpiryDays: 3 },
  { name: '닭가슴살', emoji: '🍗', category: '육류', defaultExpiryDays: 4 },
  { name: '닭다리살', emoji: '🍗', category: '육류', defaultExpiryDays: 3 },
  { name: '베이컨', emoji: '🥓', category: '가공육', defaultExpiryDays: 7 },
  { name: '스팸/통조림햄', emoji: '🥫', category: '가공육', defaultExpiryDays: 90 },
  { name: '비엔나소시지', emoji: '🌭', category: '가공육', defaultExpiryDays: 10 },
  { name: '어묵', emoji: '🍢', category: '가공식품', defaultExpiryDays: 5 },
  { name: '참치캔', emoji: '🥫', category: '통조림', defaultExpiryDays: 180 },
  { name: '옥수수콘', emoji: '🌽', category: '통조림', defaultExpiryDays: 180 },
  { name: '고등어', emoji: '🐟', category: '수산물', defaultExpiryDays: 3 },
  { name: '새우', emoji: '🦐', category: '수산물', defaultExpiryDays: 14 },
  { name: '오징어', emoji: '🦑', category: '수산물', defaultExpiryDays: 7 },
  { name: '바지락', emoji: '🐚', category: '수산물', defaultExpiryDays: 2 },
  { name: '찬밥/햇반', emoji: '🍚', category: '곡류/면', defaultExpiryDays: 5 },
  { name: '라면사리', emoji: '🍜', category: '곡류/면', defaultExpiryDays: 90 },
  { name: '스파게티면', emoji: '🍝', category: '곡류/면', defaultExpiryDays: 180 },
  { name: '우동사리', emoji: '🍜', category: '곡류/면', defaultExpiryDays: 14 },
  { name: '당면', emoji: '🍜', category: '곡류/면', defaultExpiryDays: 180 },
  { name: '떡국떡', emoji: '🍡', category: '곡류/면', defaultExpiryDays: 14 },
  { name: '식빵', emoji: '🍞', category: '빵/곡류', defaultExpiryDays: 4 },
  { name: '또띠아', emoji: '🫓', category: '빵/곡류', defaultExpiryDays: 14 },
  { name: '토마토소스', emoji: '🍅', category: '소스', defaultExpiryDays: 14 },
  { name: '케첩', emoji: '🍅', category: '소스', defaultExpiryDays: 60 },
  { name: '마요네즈', emoji: '🥣', category: '소스', defaultExpiryDays: 60 },
  { name: '카레가루', emoji: '🍛', category: '소스', defaultExpiryDays: 180 },
  { name: '김', emoji: '🍙', category: '김치/반찬', defaultExpiryDays: 60 },
  { name: '만두', emoji: '🥟', category: '냉동식품', defaultExpiryDays: 30 },
];

export const DEFAULT_PANTRY_STAPLES: PantryStaple[] = [
  { id: 'staple-salt', name: '소금', emoji: '🧂', enabled: true },
  { id: 'staple-sugar', name: '설탕', emoji: '🍚', enabled: true },
  { id: 'staple-soysauce', name: '진간장', emoji: '🫙', enabled: true },
  { id: 'staple-oil', name: '식용유', emoji: '🫒', enabled: true },
  { id: 'staple-sesame-oil', name: '참기름', emoji: '🌰', enabled: true },
  { id: 'staple-garlic', name: '다진 마늘', emoji: '🧄', enabled: true },
  { id: 'staple-chili-powder', name: '고춧가루', emoji: '🌶️', enabled: true },
  { id: 'staple-gochujang', name: '고추장', emoji: '🟥', enabled: true },
  { id: 'staple-doenjang', name: '된장', emoji: '🟫', enabled: true },
  { id: 'staple-pepper', name: '후추', emoji: '⚫', enabled: true },
  { id: 'staple-vinegar', name: '식초', emoji: '🍶', enabled: true },
  { id: 'staple-mirin', name: '맛술/미림', emoji: '🍾', enabled: true },
  { id: 'staple-oligosaccharide', name: '올리고당/물엿', emoji: '🍯', enabled: true },
  { id: 'staple-oyster-sauce', name: '굴소스', emoji: '🦪', enabled: false },
  { id: 'staple-sesame', name: '통깨', emoji: '🌾', enabled: true },
  { id: 'staple-soup-soysauce', name: '국간장', emoji: '🫙', enabled: false },
  { id: 'staple-olive-oil', name: '올리브오일', emoji: '🫒', enabled: false },
];

export const POPULAR_MENU_SUGGESTIONS = [
  '김치찌개',
  '까르보나라',
  '제육볶음',
  '된장찌개',
  '계란말이',
  '순두부찌개',
  '오므라이스',
  '알리오 올리오',
];

export function findIngredientEmoji(name: string): string {
  const normalized = name.trim();
  const exact = KOREAN_INGREDIENT_CATALOG.find((item) => item.name === normalized);
  if (exact) return exact.emoji;
  const partial = KOREAN_INGREDIENT_CATALOG.find(
    (item) => normalized.includes(item.name) || item.name.includes(normalized)
  );
  if (partial) return partial.emoji;
  if (normalized.includes('고기') || normalized.includes('돼지') || normalized.includes('소고기')) return '🥩';
  if (normalized.includes('닭')) return '🍗';
  if (normalized.includes('생선') || normalized.includes('연어') || normalized.includes('참치')) return '🐟';
  if (normalized.includes('버섯')) return '🍄';
  if (normalized.includes('치즈')) return '🧀';
  if (normalized.includes('빵')) return '🍞';
  if (normalized.includes('면') || normalized.includes('파스타')) return '🍝';
  if (normalized.includes('소스') || normalized.includes('장')) return '🫙';
  return '🥗';
}
