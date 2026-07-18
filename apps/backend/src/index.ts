import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import analyzeFoodRouter from './routes/analyze-food';
import chatCompletionsRouter from './routes/chat-completions';

const app = express();

app.use(cors());
// Base64 food photos in chat completions exceed Express default (~100kb)
app.use(express.json({ limit: '15mb' }));

app.use('/analyze-food', analyzeFoodRouter);
app.use('/v1/chat/completions', chatCompletionsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
