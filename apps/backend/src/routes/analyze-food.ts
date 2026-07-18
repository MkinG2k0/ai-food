import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AnalyzeFoodResponse, ApiError } from '@ai-food/shared-types';
import { createOpenRouterClient, getOpenRouterModel } from '../openrouter';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const NutritionItemSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  grams: z.number().optional(),
  fiber: z.number().optional(),
});

const NutritionResultSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(1),
  healthiness: z.number().min(1).max(10),
  items: z.array(NutritionItemSchema).default([]),
});

const NO_FOOD_PROMPT_RULE = `Если на изображении НЕТ съедобной еды или напитка — верни ТОЛЬКО JSON:
{ "noFood": true, "reason": string (кратко на русском, что на фото вместо еды) }
Случаи noFood: люди, животные, пейзажи, предметы, неясное/размытое фото, пустая тарелка без еды, грязь/мусор, текст/скриншоты.
НЕ придумывай блюдо и НЕ возвращай КБЖУ для таких фото. НЕ пиши foodName вроде «Неизвестное блюдо», «Нет еды», «Человек».
Если еда есть — верни обычную схему питания БЕЗ поля noFood.`;

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. Analyze the food in the image and return ONLY a JSON object.

${NO_FOOD_PROMPT_RULE}

If food or drink IS visible, return ONLY a JSON object with these exact fields:
{
  "foodName": string (название блюда или продукта на русском языке, не на английском),
  "calories": number (total kilocalories for a typical serving),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "confidence": number (0.0 to 1.0, your confidence in the estimate),
  "healthiness": number (integer 1–10, оценка полезности блюда для здоровья)
}
Все текстовые значения полей (в частности foodName) пиши на русском языке.
Do not include any text outside the JSON object.`;

const NoFoodResultSchema = z.object({
  noFood: z.literal(true),
  reason: z.string().min(1),
});

function sendApiError(res: Response, status: number, code: string, message: string): void {
  const body: ApiError = { message, code, status };
  res.status(status).json(body);
}

// Wrap multer to convert its errors (e.g. missing boundary) into INVALID_IMAGE responses
function uploadMiddleware(req: Request, res: Response, next: (err?: unknown) => void): void {
  upload.single('image')(req, res, (err) => {
    if (err) {
      sendApiError(res, 400, 'INVALID_IMAGE', 'Файл изображения не передан.');
      return;
    }
    next();
  });
}

router.post('/', uploadMiddleware, async (req: Request, res: Response) => {
  if (!req.file) {
    sendApiError(res, 400, 'INVALID_IMAGE', 'Файл изображения не передан.');
    return;
  }

  const base64Image = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;

  try {
    const startTime = Date.now();
    const completion = await createOpenRouterClient().chat.completions.create({
      model: getOpenRouterModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: 'text',
              text: 'Проанализируй это изображение еды и верни данные о питании в формате JSON.',
            },
          ],
        },
      ],
    });
    const processingTime = Date.now() - startTime;

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      console.error('OpenRouter returned empty content');
      sendApiError(res, 500, 'ANALYSIS_FAILED', 'Анализ вернул пустой ответ.');
      return;
    }

    let parsed;
    try {
      const json = JSON.parse(rawContent);
      const noFood = NoFoodResultSchema.safeParse(json);
      if (noFood.success) {
        sendApiError(
          res,
          422,
          'NO_FOOD_DETECTED',
          'На фото не обнаружена еда. Сфотографируйте блюдо и попробуйте снова.',
        );
        return;
      }
      parsed = NutritionResultSchema.parse(json);
    } catch (validationError) {
      console.error('Zod/JSON parse error:', validationError);
      sendApiError(res, 500, 'ANALYSIS_FAILED', 'Ответ анализа не соответствует ожидаемой схеме.');
      return;
    }

    const response: AnalyzeFoodResponse = { result: parsed, processingTime };
    res.json(response);
  } catch (error) {
    console.error('OpenRouter API error:', error);

    if (error instanceof OpenAI.RateLimitError) {
      sendApiError(res, 429, 'RATE_LIMITED', 'Превышен лимит запросов. Попробуйте позже.');
      return;
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      sendApiError(res, 504, 'ANALYSIS_TIMEOUT', 'Анализ превысил время ожидания. Попробуйте ещё раз.');
      return;
    }
    if (error instanceof OpenAI.BadRequestError) {
      sendApiError(res, 400, 'INVALID_IMAGE', 'Не удалось обработать изображение. Попробуйте другое фото.');
      return;
    }
    sendApiError(res, 500, 'ANALYSIS_FAILED', 'Анализ не удался. Попробуйте ещё раз.');
  }
});

export default router;
