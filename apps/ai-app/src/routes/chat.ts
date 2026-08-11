import { Router } from 'express';
import { z } from 'zod';
import type OpenAI from 'openai';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI, runOpenAIHeld } from '../../lib/openai.js';
import { finalizeQuotaUsage } from '../middleware/quota.js';
import { startGatewayRequestTimer } from '../lib/recordGatewayRequest.js';

const STREAM_TIMEOUT_MS = 120_000;

const ChatCompletionBodySchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.unknown()).min(1),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  response_format: z.unknown().optional(),
  tools: z.unknown().optional(),
  tool_choice: z.unknown().optional(),
  top_p: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  user: z.string().optional(),
});

type ChatBody = z.infer<typeof ChatCompletionBodySchema>;

function buildBaseParams(body: ChatBody) {
  return {
    model: body.model,
    messages: body.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    response_format: body.response_format as
      | OpenAI.Chat.ChatCompletionCreateParamsNonStreaming['response_format']
      | undefined,
    tools: body.tools as
      | OpenAI.Chat.ChatCompletionCreateParamsNonStreaming['tools']
      | undefined,
    tool_choice: body.tool_choice as
      | OpenAI.Chat.ChatCompletionCreateParamsNonStreaming['tool_choice']
      | undefined,
    top_p: body.top_p,
    presence_penalty: body.presence_penalty,
    frequency_penalty: body.frequency_penalty,
    user: body.user,
  };
}

export const chatRouter = Router();

chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = ChatCompletionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid chat completion request body.',
      );
    }

    const body = parsed.data;
    const baseParams = buildBaseParams(body);

    try {
      if (body.stream === true) {
        const timer = startGatewayRequestTimer();
        let ok = false;
        let startedUpstream = false;

        await runOpenAIHeld(async (client, release) => {
          const createAbort = new AbortController();
          let stream:
            | {
                controller: AbortController;
                [Symbol.asyncIterator](): AsyncIterator<
                  OpenAI.Chat.Completions.ChatCompletionChunk
                >;
              }
            | undefined;
          let disconnected = req.aborted || res.destroyed || res.writableEnded;
          let completed = false;
          const isDisconnected = () =>
            disconnected || req.aborted || res.destroyed || res.writableEnded;
          const onDisconnect = () => {
            if (completed) return;
            disconnected = true;
            createAbort.abort();
            stream?.controller.abort();
            release();
          };
          req.once('aborted', onDisconnect);
          res.once('close', onDisconnect);

          try {
            if (isDisconnected()) {
              createAbort.abort();
              release();
              return;
            }

            try {
              stream = await client.chat.completions.create(
                { ...baseParams, stream: true },
                { timeout: STREAM_TIMEOUT_MS, signal: createAbort.signal },
              );
              startedUpstream = true;
            } catch (error) {
              if (isDisconnected()) return;
              startedUpstream = true;
              throw error;
            }

            if (isDisconnected()) {
              stream.controller.abort();
              release();
              return;
            }

            await finalizeQuotaUsage(req);

            res.status(200);
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            for await (const chunk of stream) {
              if (isDisconnected()) break;
              timer.markTtfb();
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            if (!isDisconnected()) {
              timer.markTtfb();
              res.write('data: [DONE]\n\n');
              completed = true;
              ok = true;
              res.end();
            }
          } finally {
            req.off('aborted', onDisconnect);
            res.off('close', onDisconnect);
            release();
            if (startedUpstream) {
              void timer.finish({
                ok,
                type: 'chat_completions',
                stream: true,
                userId: req.quota?.userId,
                deviceId: req.quota?.devicePropId,
              });
            }
          }
        });
        return;
      }

      const timer = startGatewayRequestTimer();
      let ok = false;
      try {
        const completion = await runOpenAI((client) =>
          client.chat.completions.create({
            ...baseParams,
            stream: false,
          }),
        );
        await finalizeQuotaUsage(req);
        timer.markTtfb();
        ok = true;
        res.json(completion);
      } finally {
        void timer.finish({
          ok,
          type: 'chat_completions',
          stream: false,
          userId: req.quota?.userId,
          deviceId: req.quota?.devicePropId,
        });
      }
    } catch (error) {
      console.error('OpenRouter chat.completions error:', error);
      if (!res.headersSent) {
        const mapped = mapOpenAIError(error);
        throw new ApiError(mapped.status, mapped.code, mapped.message);
      }
      res.end();
    }
  }),
);
