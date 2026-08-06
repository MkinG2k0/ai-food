import type OpenAI from 'openai';
import {
  DEFAULT_ANALYZE_FEATURES,
  type AnalyzeFeatures,
} from './analyzeFeatures.js';
import {
  appendCustomInstructions,
  appendDietPreference,
  buildAnalyzeTextUserPrompt,
  buildAnalyzeVisionUserText,
  buildQuestionUserText,
  buildRefineSystemPrompt,
  buildRefineUserText,
  buildSettingsUserText,
  QUESTION_SYSTEM_PROMPT,
  selectAnalyzeSystemPrompt,
  SETTINGS_SYSTEM_PROMPT,
  type DietType,
} from './prompts.js';

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

export function buildAnalyzeMessages(input: {
  images: string[];
  description?: string;
  customInstructions?: string;
  dietType?: DietType;
  features?: AnalyzeFeatures;
  model: string;
}): ChatMessage[] {
  const features = input.features ?? DEFAULT_ANALYZE_FEATURES;
  const hasImage = input.images.length > 0;
  const description = input.description?.trim() ?? '';

  const systemContent = appendDietPreference(
    appendCustomInstructions(
      selectAnalyzeSystemPrompt(hasImage, input.model, features),
      input.customInstructions,
    ),
    input.dietType,
  );

  let userContent: string | OpenAI.Chat.ChatCompletionContentPart[];
  if (hasImage) {
    const visionText = buildAnalyzeVisionUserText(input.images.length, description);
    userContent = [
      { type: 'text', text: visionText },
      ...input.images.map((url) => ({
        type: 'image_url' as const,
        image_url: { url },
      })),
    ];
  } else {
    userContent = buildAnalyzeTextUserPrompt(description, features.composition);
  }

  // cache_control is OpenRouter-specific; cast keeps OpenAI SDK types happy.
  const systemMessage = {
    role: 'system' as const,
    content: [
      {
        type: 'text' as const,
        text: systemContent,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
  } as ChatMessage;

  return [systemMessage, { role: 'user', content: userContent }];
}

export function buildRefineMessages(input: {
  correction: string;
  mealContext: { name?: string; items: unknown[] };
  imageDataUrl?: string;
  customInstructions?: string;
  dietType?: DietType;
  features?: AnalyzeFeatures;
}): ChatMessage[] {
  const features = input.features ?? DEFAULT_ANALYZE_FEATURES;
  const systemContent = appendDietPreference(
    appendCustomInstructions(
      buildRefineSystemPrompt(features),
      input.customInstructions,
    ),
    input.dietType,
  );

  const userText = buildRefineUserText(input.correction, input.mealContext);
  const imageDataUrl = input.imageDataUrl?.trim();
  const userContent =
    imageDataUrl && imageDataUrl.startsWith('data:')
      ? ([
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: userText },
        ] as OpenAI.Chat.ChatCompletionContentPart[])
      : userText;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}

export function buildAskMessages(input: {
  mealContext: unknown;
  customInstructions?: string;
  question?: string;
}): ChatMessage[] {
  const question = input.question?.trim() ?? '';
  const instructions = input.customInstructions?.trim() ?? '';
  const isQuestion = question.length > 0;

  const systemContent = isQuestion
    ? QUESTION_SYSTEM_PROMPT
    : SETTINGS_SYSTEM_PROMPT;
  const userText = isQuestion
    ? buildQuestionUserText(question, input.mealContext)
    : buildSettingsUserText(instructions, input.mealContext);

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userText },
  ];
}
