import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const isLocal = process.env.IS_LOCAL === 'true';
const host = isLocal ? '127.0.0.1' : '0.0.0.0';
const app = createApp();

app.listen(port, host, () => {
  console.log(`openrouter-gateway listening on http://${host}:${port}`);
});
