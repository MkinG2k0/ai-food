import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { DiaryPage } from '@/pages/diary';
import { OnboardingPage } from '@/pages/onboarding';
import { MealDetailPage } from '@/pages/meal-detail';
import { FoodItemEditPage } from '@/pages/food-item-edit';
import { StatsPage } from '@/pages/stats';
import { SettingsPage } from '@/pages/settings';
import { NewsPage } from '@/pages/news';
import { FavoritesPage } from '@/pages/favorites';
import { ManualEntryPage } from '@/pages/manual-entry';
import { BarcodePage } from '@/pages/barcode';
import { LoginPage } from '@/pages/login';
import { ModelTestPage } from '@/pages/model-test';
import { AppShell } from './AppShell';
import { ProfileGuard } from './ProfileGuard';

const router = createBrowserRouter([
  ...(import.meta.env.DEV
    ? [{ path: '/model-test', element: <ModelTestPage /> }]
    : []),
  {
    element: <AppShell />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <ProfileGuard><HomePage /></ProfileGuard> },
      { path: '/diary', element: <ProfileGuard><DiaryPage /></ProfileGuard> },
      { path: '/stats', element: <ProfileGuard><StatsPage /></ProfileGuard> },
      { path: '/settings', element: <ProfileGuard><SettingsPage /></ProfileGuard> },
      { path: '/news', element: <ProfileGuard><NewsPage /></ProfileGuard> },
      { path: '/favorites', element: <ProfileGuard><FavoritesPage /></ProfileGuard> },
      { path: '/manual-entry', element: <ProfileGuard><ManualEntryPage /></ProfileGuard> },
      { path: '/barcode', element: <ProfileGuard><BarcodePage /></ProfileGuard> },
      { path: '/meal/:id', element: <ProfileGuard><MealDetailPage /></ProfileGuard> },
      {
        path: '/meal/:mealId/item/:itemId',
        element: <ProfileGuard><FoodItemEditPage /></ProfileGuard>,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
