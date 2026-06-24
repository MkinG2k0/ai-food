import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home/ui/HomePage';
import { AddFoodPage } from '@/pages/add-food/ui/AddFoodPage';
import { ResultPage } from '@/pages/result/ui/ResultPage';
import { DiaryPage } from '@/pages/diary/ui/DiaryPage';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/add', element: <AddFoodPage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/diary', element: <DiaryPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
