# AI App — OpenAI Gateway

## What
Standalone Express service that proxies OpenAI so any of our apps can call chat, vision, and related AI features via HTTP endpoints without embedding the OpenAI SDK or API key client-side.

## Why
Code was extracted from the `@ai-food` monorepo (`analyze-food` only). It needs to become a reusable OpenAI backend with general-purpose endpoints.

## Success
- No monorepo/workspace dependencies
- OpenAI key stays server-side
- Apps can call chat, vision/image, embeddings, models, and health via REST
- Consistent error shape across endpoints
