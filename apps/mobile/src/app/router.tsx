import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { AddFoodPage } from '@/pages/add-food';
import { ResultPage } from '@/pages/result';
import { DiaryPage } from '@/pages/diary';
import { OnboardingPage } from '@/pages/onboarding';
import { MealDetailPage } from '@/pages/meal-detail';
import { ProfileGuard } from './ProfileGuard';

const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/', element: <ProfileGuard><HomePage /></ProfileGuard> },
  { path: '/add', element: <ProfileGuard><AddFoodPage /></ProfileGuard> },
  { path: '/result', element: <ProfileGuard><ResultPage /></ProfileGuard> },
  { path: '/diary', element: <ProfileGuard><DiaryPage /></ProfileGuard> },
  { path: '/meal/:id', element: <ProfileGuard><MealDetailPage /></ProfileGuard> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
