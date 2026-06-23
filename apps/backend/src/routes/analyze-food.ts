import { Router } from 'express';
import multer from 'multer';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MOCK_RESPONSE: AnalyzeFoodResponse = {
  result: {
    foodName: 'Grilled Chicken Salad',
    calories: 320,
    protein: 35,
    carbs: 18,
    fat: 12,
    fiber: 4,
    confidence: 0.89,
  },
  processingTime: 2100,
};

router.post('/', upload.single('image'), (_req, res) => {
  const delay = 1500 + Math.random() * 1500;
  setTimeout(() => {
    res.json(MOCK_RESPONSE);
  }, delay);
});

export default router;
