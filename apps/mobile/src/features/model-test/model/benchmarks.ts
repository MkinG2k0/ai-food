export interface KbjuReference {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodBenchmark {
  id: string;
  name: string;
  /** File under /public/food/ */
  imageFile: string;
  weightGrams: number;
  reference: KbjuReference;
}

export const FOOD_BENCHMARKS: FoodBenchmark[] = [
  {
    id: 'chef-sandwich',
    name: 'Шеф Сэндвич оригинальный',
    imageFile: 'Шеф Сэндвич оригинальный.png',
    weightGrams: 296,
    reference: {
      calories: 610,
      protein: 35.2,
      fat: 25.5,
      carbs: 60.1,
    },
  },
  {
    id: 'maestro-veggie',
    name: 'Маэстро Веджи Чиз Пармезан',
    imageFile: 'Маэстро Веджи Чиз Пармезан.png',
    weightGrams: 195,
    reference: {
      calories: 566,
      protein: 21.6,
      fat: 28.3,
      carbs: 56.2,
    },
  },
  {
    id: 'veggie-roll',
    name: 'Веджи Чиз Ролл классический',
    imageFile: 'Веджи Чиз Ролл классический.png',
    weightGrams: 166,
    reference: {
      calories: 488,
      protein: 13.4,
      fat: 23.6,
      carbs: 55.6,
    },
  },
];
