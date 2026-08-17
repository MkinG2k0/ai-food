import { motion, useReducedMotion } from 'framer-motion';
import { useDiaryStore } from '@/entities/meal';
import { localDateKey } from '@/entities/streak';
import { SwipeableMealCard } from '@/features/delete-meal';
import { entranceListItem, isSameDay } from '@/shared/lib';

interface MealListProps {
  selectedDate: Date;
}

export function MealList({ selectedDate }: MealListProps) {
  const meals = useDiaryStore((s) => s.meals);
  const reducedMotion = useReducedMotion();
  const entranceKey = localDateKey(selectedDate);

  const isToday = isSameDay(selectedDate, new Date());
  const filteredMeals = meals.filter((m) =>
    isSameDay(new Date(m.timestamp), selectedDate),
  );

  if (filteredMeals.length === 0) {
    return (
      <motion.div
        key={entranceKey}
        className="flex h-48 flex-col items-center justify-center text-muted-foreground"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-base font-medium">
          {isToday ? 'Сегодня приёмов пищи нет' : 'В этот день приёмов пищи нет'}
        </p>
        {isToday && (
          <p className="mt-1 text-sm">Нажмите +, чтобы добавить первое блюдо</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      key={entranceKey}
      className="space-y-3"
      initial="hidden"
      animate="show"
    >
      {filteredMeals.map((meal, index) => (
        <motion.div
          key={meal.id}
          variants={entranceListItem(reducedMotion)}
          custom={index}
        >
          <SwipeableMealCard meal={meal} entranceKey={entranceKey} />
        </motion.div>
      ))}
    </motion.div>
  );
}
