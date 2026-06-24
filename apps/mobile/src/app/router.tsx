import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { AddFoodPage } from '@/pages/add-food';
import { ResultPage } from '@/pages/result';
import { DiaryPage } from '@/pages/diary';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/add', element: <AddFoodPage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/diary', element: <DiaryPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
