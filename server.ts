import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets에서 API 키를 확인해주세요.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(res: Response, err: unknown, fallbackMsg: string): void {
  const rawMessage = err instanceof Error ? err.message : String(err);
  let status = 500;
  let userMessage = fallbackMsg;

  if (rawMessage.includes('GEMINI_API_KEY')) {
    status = 400;
    userMessage = rawMessage;
  } else if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('400')) {
    status = 400;
    userMessage = 'API 키가 유효하지 않거나 요청 형식이 올바르지 않습니다. Settings > Secrets를 확인해주세요.';
  } else if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('403')) {
    status = 403;
    userMessage = 'Gemini API 접근 권한이 없습니다. Settings > Secrets에서 API 키 권한을 확인해주세요.';
  } else if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    status = 429;
    userMessage = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  } else if (rawMessage.includes('NOT_FOUND') || rawMessage.includes('404')) {
    status = 404;
    userMessage = '요청한 AI 모델을 찾을 수 없습니다. 잠시 후 다시 시도해주세요.';
  } else if (rawMessage) {
    userMessage = `${fallbackMsg} (${rawMessage.slice(0, 120)})`;
  }

  console.error('[Gemini Error]', rawMessage);
  res.status(status).json({ error: userMessage });
}

const recipeIngredientSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: '재료 이름 (한국어)' },
    metricAmount: { type: Type.NUMBER, description: '기준 인분당 무게 또는 부피 숫자 (g 또는 ml, 개수 기반이면 개 단위 숫자)' },
    metricUnit: { type: Type.STRING, description: 'g, ml, 개, 모, 장 등' },
    householdAmount: { type: Type.NUMBER, description: '기준 인분당 가정용 계량 숫자 (0.5 단위 권장)' },
    householdUnit: { type: Type.STRING, description: '큰술, 작은술, 컵, 개, 줌, 적당량 등' },
    note: { type: Type.STRING, description: '손질 방법 또는 선택 메모' },
    inFridge: { type: Type.BOOLEAN, description: '사용자의 냉장고나 기본 재료에 포함되어 있는지 여부' },
    isSubstituted: { type: Type.BOOLEAN, description: '대체 재료가 적용된 항목인지 여부' },
    substituteNote: { type: Type.STRING, description: '대체 재료인 경우 원래 재료 대비 비율과 안내' },
  },
  required: ['name', 'metricAmount', 'metricUnit', 'householdAmount', 'householdUnit', 'inFridge'],
};

const recipeStepSchema = {
  type: Type.OBJECT,
  properties: {
    stepNumber: { type: Type.INTEGER },
    title: { type: Type.STRING, description: '단계 요약 제목 (10자 내외)' },
    instruction: { type: Type.STRING, description: '초보자도 따라 할 수 있는 구체적인 조리 설명' },
    heatLevel: {
      type: Type.STRING,
      description: '반드시 다음 중 하나: 약불, 중불, 강불, 불 끄기, 조리 불필요',
    },
    durationMinutes: { type: Type.NUMBER, description: '예상 소요 시간(분). 1분 미만이면 0.5 등' },
    timerSeconds: {
      type: Type.INTEGER,
      description: '타이머가 필요한 가열/끓이기/굽기/재우기 단계면 초 단위 시간(예: 180), 불필요하면 0',
    },
    visualCue: { type: Type.STRING, description: '눈으로 확인할 완성 상태 (예: 양파가 투명해질 때까지)' },
    failTip: { type: Type.STRING, description: '실패하기 쉬운 포인트와 해결 팁' },
  },
  required: ['stepNumber', 'title', 'instruction', 'heatLevel', 'durationMinutes', 'timerSeconds', 'visualCue', 'failTip'],
};

const recipeObjectSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING, description: '한국어 메뉴명' },
    emoji: { type: Type.STRING, description: '메뉴를 대표하는 음식 이모지 1개' },
    summary: { type: Type.STRING, description: '한 줄 맛/특징 설명' },
    cookTimeMinutes: { type: Type.INTEGER },
    difficulty: { type: Type.STRING, description: '쉬움 또는 보통' },
    baseServings: { type: Type.INTEGER, description: '요청한 기준 인분수' },
    matchPercent: { type: Type.INTEGER, description: '보유 재료 일치율 (0~100 정수)' },
    matchedIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    usedUrgentIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    substitutionSummary: { type: Type.STRING, description: '대체 재료가 반영된 경우 요약 설명' },
    ingredients: { type: Type.ARRAY, items: recipeIngredientSchema },
    steps: { type: Type.ARRAY, items: recipeStepSchema },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        caloriesKcal: { type: Type.INTEGER },
        carbsG: { type: Type.INTEGER },
        proteinG: { type: Type.INTEGER },
        fatG: { type: Type.INTEGER },
        allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['caloriesKcal', 'carbsG', 'proteinG', 'fatG', 'allergens'],
    },
    storageGuide: { type: Type.STRING, description: '남은 음식 보관 방법' },
    reheatGuide: { type: Type.STRING, description: '맛을 살리는 재가열 방법' },
    leftoverIdeas: { type: Type.ARRAY, items: { type: Type.STRING }, description: '남은 재료 활용 아이디어 2~3개' },
  },
  required: [
    'id',
    'title',
    'emoji',
    'summary',
    'cookTimeMinutes',
    'difficulty',
    'baseServings',
    'matchPercent',
    'matchedIngredients',
    'missingIngredients',
    'usedUrgentIngredients',
    'ingredients',
    'steps',
    'nutrition',
    'storageGuide',
    'reheatGuide',
    'leftoverIdeas',
  ],
};

function sanitizeRecipe(raw: Record<string, unknown>, fallbackServings: number) {
  const validHeats = ['약불', '중불', '강불', '불 끄기', '조리 불필요'];
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s: Record<string, unknown>, i: number) => ({
        stepNumber: typeof s.stepNumber === 'number' ? s.stepNumber : i + 1,
        title: String(s.title || `${i + 1}단계`),
        instruction: String(s.instruction || ''),
        heatLevel: validHeats.includes(String(s.heatLevel)) ? String(s.heatLevel) : '중불',
        durationMinutes: Number(s.durationMinutes) || 1,
        timerSeconds: Math.max(0, Math.round(Number(s.timerSeconds) || 0)),
        visualCue: String(s.visualCue || '재료가 고르게 익을 때까지'),
        failTip: String(s.failTip || '불이 너무 세지 않게 조절하세요.'),
      }))
    : [];

  return {
    ...raw,
    id: String(raw.id || `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    difficulty: raw.difficulty === '보통' ? '보통' : '쉬움',
    baseServings: Number(raw.baseServings) || fallbackServings,
    matchPercent: Math.min(100, Math.max(0, Math.round(Number(raw.matchPercent) || 0))),
    steps,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // 1. 사진에서 식재료 인식
  app.post('/api/recognize-ingredients', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };
      if (!imageBase64 || !mimeType) {
        res.status(400).json({ error: '이미지 데이터가 올바르지 않습니다.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text: '이 냉장고 또는 식재료 사진에서 요리에 활용할 수 있는 식재료를 모두 찾아 한국어 이름으로 정리해주세요. 포장지나 용기 안의 식재료도 식별 가능한 범위에서 추론해주세요.',
            },
          ],
        },
        config: {
          systemInstruction:
            '당신은 한국 가정집 냉장고 식재료를 정확히 식별하는 요리 전문가입니다. 모든 응답은 자연스러운 한국어 식재료명(예: 대파, 애호박, 두부, 달걀, 삼겹살, 김치, 우유)으로만 작성하세요. 조미료나 식기가 아닌 실제 식재료를 중심으로 추출하고, 중복 없이 깔끔하게 정리하세요.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: '한국어 식재료 이름' },
                    emoji: { type: Type.STRING, description: '어울리는 음식 이모지 1개' },
                    category: { type: Type.STRING, description: '채소, 육류, 수산물, 유제품, 김치/반찬, 가공식품, 곡류/면 중 하나' },
                    quantityHint: { type: Type.STRING, description: '사진에서 보이는 대략적인 양 (예: 1단, 반 모, 4개)' },
                    suggestedExpiryDays: { type: Type.INTEGER, description: '신선도 기준 권장 소비기한 일수 (1~30)' },
                  },
                  required: ['name', 'emoji', 'category', 'quantityHint', 'suggestedExpiryDays'],
                },
              },
            },
            required: ['ingredients'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"ingredients":[]}');
      res.json(parsed);
    } catch (err) {
      handleGeminiError(res, err, '사진에서 재료를 인식하는 중 문제가 발생했습니다.');
    }
  });

  // 2. 보유 재료 기반 요리 3~5개 추천 (상세 레시피 포함)
  app.post('/api/recommend-recipes', async (req: Request, res: Response) => {
    try {
      const {
        ingredients = [],
        pantryStaples = [],
        priorityIngredients = [],
        preferences,
      } = req.body as {
        ingredients: Array<{ name: string; daysUntilExpiry?: number | null }>;
        pantryStaples: string[];
        priorityIngredients: string[];
        preferences: {
          servings: number;
          timeLimit: string;
          difficulty: string;
          diet: string;
          tools: string[];
        };
      };

      if (!ingredients.length) {
        res.status(400).json({ error: '냉장고에 최소 1개 이상의 재료를 추가해주세요.' });
        return;
      }

      const ai = getAiClient();
      const ingredientListText = ingredients
        .map((i) =>
          typeof i.daysUntilExpiry === 'number' && i.daysUntilExpiry <= 3
            ? `${i.name}(유통기한 임박: ${i.daysUntilExpiry <= 0 ? '오늘까지' : `${i.daysUntilExpiry}일 남음`})`
            : i.name
        )
        .join(', ');

      const prompt = [
        `[보유 냉장고 재료]: ${ingredientListText}`,
        `[보유 기본 양념/재료]: ${pantryStaples.length ? pantryStaples.join(', ') : '없음'}`,
        priorityIngredients.length
          ? `[우선 소비 필요(유통기한 임박)]: ${priorityIngredients.join(', ')} — 가능한 한 이 재료를 메인으로 활용하는 메뉴를 우선 추천하세요.`
          : '',
        `[조리 조건]`,
        `- 인원수: ${preferences.servings}인분`,
        `- 조리 시간 제한: ${preferences.timeLimit}`,
        `- 선호 난이도: ${preferences.difficulty}`,
        `- 식단 조건: ${preferences.diet}`,
        `- 사용 가능한 조리 도구: ${preferences.tools.length ? preferences.tools.join(', ') : '제한 없음(일반 가정집 도구)'}`,
        ``,
        `위 조건과 보유 재료에 딱 맞는 한국 가정식/집밥 요리 4가지를 추천해주세요. 각 레시피는 바로 따라 만들 수 있도록 모든 재료(g/ml와 큰술·컵 등 가정용 계량 병기), 단계별 조리 순서(불 세기, 타이머 초 단위, 눈으로 확인할 완성 상태, 실패 팁), 영양 정보(참고용), 보관·재가열·남은 재료 활용 팁까지 완결된 형태로 작성하세요.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            '당신은 한국 가정집 식탁과 주방 사정을 속속들이 아는 베테랑 집밥 요리 연구가입니다. 모든 응답은 반드시 한국어로 작성하며, 한국 가정집 기준의 계량(g/ml와 밥숟가락·종이컵·큰술 병기)과 프라이팬/냄비/전자레인지 등 요청된 도구만 사용하여 안내합니다. 보유 재료와 기본 양념에 있는 재료는 inFridge=true로, 없는 재료는 inFridge=false로 정확히 구분하고 matchPercent를 현실적으로 계산하세요.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recipes: {
                type: Type.ARRAY,
                items: recipeObjectSchema,
              },
            },
            required: ['recipes'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"recipes":[]}') as {
        recipes: Record<string, unknown>[];
      };
      const recipes = (parsed.recipes || []).map((r) => sanitizeRecipe(r, preferences.servings || 2));
      res.json({ recipes });
    } catch (err) {
      handleGeminiError(res, err, '맞춤 요리 추천을 생성하는 중 오류가 발생했습니다.');
    }
  });

  // 3. 메뉴 검색: 보유 재료 vs 없는 재료 vs 대체 가능 재료 분석
  app.post('/api/analyze-menu', async (req: Request, res: Response) => {
    try {
      const {
        menuName,
        fridgeIngredients = [],
        pantryStaples = [],
        mode = 'authentic',
      } = req.body as {
        menuName?: string;
        fridgeIngredients: string[];
        pantryStaples: string[];
        mode: 'authentic' | 'simple';
      };

      if (!menuName || !menuName.trim()) {
        res.status(400).json({ error: '검색할 메뉴 이름을 입력해주세요.' });
        return;
      }

      const ai = getAiClient();
      const modeDesc =
        mode === 'authentic'
          ? '원래 맛에 가깝게 (본연의 풍미와 식감을 최대한 살리는 방향)'
          : '있는 재료로 최대한 간단하게 (집에 있는 재료 위주로 과정을 줄이고 과감하게 대체하는 방향)';

      const prompt = [
        `[먹고 싶은 메뉴]: ${menuName.trim()}`,
        `[조리 방향 옵션]: ${modeDesc}`,
        `[내 냉장고 재료]: ${fridgeIngredients.length ? fridgeIngredients.join(', ') : '비어 있음'}`,
        `[보유 기본 재료]: ${pantryStaples.length ? pantryStaples.join(', ') : '없음'}`,
        ``,
        `이 메뉴를 만들기 위해 필요한 재료를 사용자 보유 재료와 대조하여 다음 3가지로 명확히 분류해주세요:`,
        `1. haveIngredients: 가지고 있는 재료 (냉장고/기본 재료 구분)`,
        `2. substitutableIngredients: 집에 없지만 보유한 재료나 흔한 대체품으로 바꿀 수 있는 재료. 반드시 구체적 대체 비율(예: 생크림 100ml → 우유 80ml + 버터 10g)과 맛·식감 변화를 설명하세요.`,
        `3. missingIngredients: 대체가 어렵거나 집에 없어서 구매해야 하는 재료. 맛의 정체성을 좌우해 대체가 불가능한 핵심 재료는 isEssential=true("꼭 필요")로 표시하고 이유를 설명하세요.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            '당신은 식재료 대체 과학에 정통한 한국 요리 셰프입니다. 사용자의 냉장고 재료를 우선 활용하여 대체안을 제시하되, 김치찌개의 김치처럼 대체 불가능한 핵심 재료는 무리하게 대체하지 말고 "꼭 필요"로 정직하게 분류하세요. 모든 텍스트는 한국어로, 계량은 한국 가정집 기준으로 명확히 작성하세요.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              menuName: { type: Type.STRING },
              emoji: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              difficulty: { type: Type.STRING, description: '쉬움 또는 보통' },
              haveIngredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amountText: { type: Type.STRING },
                    source: { type: Type.STRING, description: '냉장고 또는 기본 재료' },
                  },
                  required: ['name', 'amountText', 'source'],
                },
              },
              substitutableIngredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalName: { type: Type.STRING },
                    originalAmount: { type: Type.STRING },
                    substituteName: { type: Type.STRING },
                    substituteSource: { type: Type.STRING, description: '냉장고, 기본 재료, 대체 추천 중 하나' },
                    ratioText: { type: Type.STRING, description: '예: 생크림 100ml → 우유 80ml + 버터 10g' },
                    tasteTextureImpact: { type: Type.STRING, description: '맛과 식감이 어떻게 달라지는지 구체적 설명' },
                  },
                  required: [
                    'originalName',
                    'originalAmount',
                    'substituteName',
                    'substituteSource',
                    'ratioText',
                    'tasteTextureImpact',
                  ],
                },
              },
              missingIngredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amountText: { type: Type.STRING },
                    isEssential: { type: Type.BOOLEAN, description: '대체 불가능한 꼭 필요한 핵심 재료인지 여부' },
                    reason: { type: Type.STRING, description: '왜 필요하거나 대체가 어려운지 설명' },
                  },
                  required: ['name', 'amountText', 'isEssential', 'reason'],
                },
              },
            },
            required: [
              'menuName',
              'emoji',
              'description',
              'estimatedMinutes',
              'difficulty',
              'haveIngredients',
              'substitutableIngredients',
              'missingIngredients',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err) {
      handleGeminiError(res, err, '메뉴 재료를 분석하는 중 오류가 발생했습니다.');
    }
  });

  // 4. 대체 재료 반영 상세 레시피 생성
  app.post('/api/build-substituted-recipe', async (req: Request, res: Response) => {
    try {
      const {
        menuName,
        mode = 'authentic',
        servings = 2,
        fridgeIngredients = [],
        pantryStaples = [],
        acceptedSubstitutions = [],
        missingItems = [],
      } = req.body as {
        menuName: string;
        mode: 'authentic' | 'simple';
        servings: number;
        fridgeIngredients: string[];
        pantryStaples: string[];
        acceptedSubstitutions: Array<{ originalName: string; substituteName: string; ratioText: string }>;
        missingItems: string[];
      };

      const ai = getAiClient();
      const subText = acceptedSubstitutions.length
        ? acceptedSubstitutions
            .map((s) => `- ${s.originalName} 대신 ${s.substituteName} 사용 (${s.ratioText})`)
            .join('\n')
        : '적용된 대체 재료 없음';

      const prompt = [
        `[메뉴]: ${menuName}`,
        `[조리 방향]: ${mode === 'authentic' ? '원래 맛에 가깝게' : '있는 재료로 최대한 간단하게'}`,
        `[기준 인분수]: ${servings}인분`,
        `[보유 냉장고 재료]: ${fridgeIngredients.join(', ') || '없음'}`,
        `[보유 기본 재료]: ${pantryStaples.join(', ') || '없음'}`,
        `[적용할 대체 재료]:\n${subText}`,
        `[미보유(장보기 필요) 재료]: ${missingItems.join(', ') || '없음'}`,
        ``,
        `위 대체 재료를 조리 과정과 재료 목록에 정확히 반영하여, 바로 요리할 수 있는 상세 레시피를 작성해주세요. 대체된 재료는 isSubstituted=true로 표시하고 substituteNote에 원래 재료 대비 대체 안내를 적으세요.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            '당신은 대체 재료를 반영해 실제 집에서 완벽히 성공할 수 있는 레시피를 설계하는 한국인 셰프입니다. 모든 응답은 한국어로 작성하며, 대체 재료 투입 타이밍과 불 조절 팁까지 조리 단계에 자연스럽게 녹여 안내하세요.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: recipeObjectSchema,
        },
      });

      const parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
      res.json({ recipe: sanitizeRecipe(parsed, servings) });
    } catch (err) {
      handleGeminiError(res, err, '대체 레시피를 만드는 중 오류가 발생했습니다.');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`냉장고 요리사 서버 실행 중: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
