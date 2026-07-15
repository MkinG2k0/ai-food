import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { DiaryPage } from '@/pages/diary';
import { OnboardingPage } from '@/pages/onboarding';
import { MealDetailPage } from '@/pages/meal-detail';
import { FoodItemEditPage } from '@/pages/food-item-edit';
import { ProfileGuard } from './ProfileGuard';

const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/', element: <ProfileGuard><HomePage /></ProfileGuard> },
  { path: '/diary', element: <ProfileGuard><DiaryPage /></ProfileGuard> },
  { path: '/meal/:id', element: <ProfileGuard><MealDetailPage /></ProfileGuard> },
  { path: '/meal/:mealId/item/:itemId', element: <ProfileGuard><FoodItemEditPage /></ProfileGuard> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
