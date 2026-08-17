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
import { FriendsPage, FriendProfilePage } from '@/pages/friends';
import { ManualEntryPage } from '@/pages/manual-entry';
import { BarcodePage } from '@/pages/barcode';
import { ScanPage } from '@/pages/scan';
import { LoginPage } from '@/pages/login';
import { SubscribePage } from '@/pages/subscribe';
import { ModelTestPage } from '@/pages/model-test';
import { ConsentPage } from '@/pages/consent';
import { AppShell } from './AppShell';
import { ConsentGuard } from './ConsentGuard';
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
      { path: '/consent', element: <ConsentPage /> },
      { path: '/subscribe', element: <SubscribePage /> },
      { path: '/subscribe/success', element: <SubscribePage /> },
      { path: '/subscribe/fail', element: <SubscribePage /> },
      {
        path: '/',
        element: (
          <ConsentGuard>
            <ProfileGuard><HomePage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/diary',
        element: (
          <ConsentGuard>
            <ProfileGuard><DiaryPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/stats',
        element: (
          <ConsentGuard>
            <ProfileGuard><StatsPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/settings',
        element: (
          <ConsentGuard>
            <ProfileGuard><SettingsPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/news',
        element: (
          <ConsentGuard>
            <ProfileGuard><NewsPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/favorites',
        element: (
          <ConsentGuard>
            <ProfileGuard><FavoritesPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/friends',
        element: (
          <ConsentGuard>
            <ProfileGuard><FriendsPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/friends/:userId',
        element: (
          <ConsentGuard>
            <ProfileGuard><FriendProfilePage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/manual-entry',
        element: (
          <ConsentGuard>
            <ProfileGuard><ManualEntryPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/scan',
        element: (
          <ConsentGuard>
            <ProfileGuard><ScanPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/barcode',
        element: (
          <ConsentGuard>
            <ProfileGuard><BarcodePage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/meal/:id',
        element: (
          <ConsentGuard>
            <ProfileGuard><MealDetailPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
      {
        path: '/meal/:mealId/item/:itemId',
        element: (
          <ConsentGuard>
            <ProfileGuard><FoodItemEditPage /></ProfileGuard>
          </ConsentGuard>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
