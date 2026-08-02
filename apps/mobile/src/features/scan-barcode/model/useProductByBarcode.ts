import { useQuery } from '@tanstack/react-query';
import {
  fetchProductByBarcode,
  normalizeBarcode,
  type OffProduct,
} from '../api/fetchProductByBarcode';

export function useProductByBarcode(rawCode: string | null) {
  const code = rawCode ? normalizeBarcode(rawCode) : '';
  return useQuery<OffProduct, Error>({
    queryKey: ['openfoodfacts', 'product', code],
    queryFn: () => fetchProductByBarcode(code),
    enabled: code.length >= 8,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
