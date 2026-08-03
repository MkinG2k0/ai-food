import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarcodeProductConfirm,
  BarcodeScanner,
  OffProductError,
  normalizeBarcode,
  useProductByBarcode,
  useSaveBarcodeMeal,
} from '@/features/scan-barcode';
import { Button, SubpageShell } from '@/shared/ui';
import { cn } from '@/shared/lib';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

export function BarcodePage() {
  const navigate = useNavigate();
  const saveBarcodeMeal = useSaveBarcodeMeal();
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, error, isFetching, isSuccess, isError } =
    useProductByBarcode(lookupCode);

  useEffect(() => {
    if (!isError || !error) return;
    const message =
      error instanceof OffProductError
        ? error.message
        : 'Не удалось загрузить продукт';
    toast.error(message);
    setLookupCode(null);
  }, [isError, error]);

  const handleScan = (code: string) => {
    const normalized = normalizeBarcode(code);
    if (normalized.length < 8) {
      toast.message('Не удалось распознать код');
      return;
    }
    setManualCode(normalized);
    setLookupCode(normalized);
  };

  const handleManualSubmit = () => {
    const normalized = normalizeBarcode(manualCode);
    if (normalized.length < 8) {
      toast.message('Введите штрихкод (минимум 8 цифр)');
      return;
    }
    setLookupCode(normalized);
  };

  const handleCancelConfirm = () => {
    setLookupCode(null);
  };

  const handleConfirm = async (grams: number) => {
    if (!data) return;
    setSaving(true);
    try {
      await saveBarcodeMeal(data, grams);
      toast.success('Добавлено в дневник');
      navigate('/');
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const showConfirm = Boolean(lookupCode) && isSuccess && data && !isFetching;

  return (
    <SubpageShell
      title="Штрихкод"
      onBack={() => navigate(-1)}
      mainClassName="space-y-6"
    >
      {showConfirm && data ? (
        <BarcodeProductConfirm
          product={data}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          saving={saving}
        />
      ) : (
        <>
          <BarcodeScanner
            onScan={handleScan}
            paused={Boolean(lookupCode) && isFetching}
          />

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                Или введите код
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="EAN / UPC"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
                className={inputClassName}
              />
            </label>
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleManualSubmit}
              disabled={isFetching}
            >
              {isFetching ? 'Поиск…' : 'Найти'}
            </Button>
          </div>
        </>
      )}
    </SubpageShell>
  );
}
