import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import analyzeFoodRouter from './routes/analyze-food';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/analyze-food', analyzeFoodRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
