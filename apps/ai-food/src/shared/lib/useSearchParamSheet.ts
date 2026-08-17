import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SHEET_PARAM = 'sheet';

/**
 * Binds a bottom sheet to `?sheet=<value>`.
 * Opening pushes history; browser/system back closes the sheet.
 */
export function useSearchParamSheet(value: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOpen = searchParams.get(SHEET_PARAM) === value;

  const open = useCallback(() => {
    if (searchParams.get(SHEET_PARAM) === value) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(SHEET_PARAM, value);
      return next;
    });
  }, [searchParams, setSearchParams, value]);

  const close = useCallback(() => {
    if (searchParams.get(SHEET_PARAM) === value) {
      navigate(-1);
    }
  }, [navigate, searchParams, value]);

  return { isOpen, open, close };
}
