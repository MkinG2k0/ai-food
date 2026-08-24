import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ImportMealsPreview,
  commitImport,
  useImportMealsStore,
  useImportPreviewRows,
} from '@/features/import-meals';
import { SubpageShell } from '@/shared/ui';

/** Bumps on each mount; cleanup only clears when no newer mount exists (StrictMode-safe). */
let importMealsPageMountGen = 0;

export function ImportMealsPage() {
  const navigate = useNavigate();
  const drafts = useImportMealsStore((state) => state.drafts);
  const clear = useImportMealsStore((state) => state.clear);
  const rows = useImportPreviewRows();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (drafts.length === 0) {
      navigate('/settings', { replace: true });
    }
  }, [drafts.length, navigate]);

  useEffect(() => {
    const gen = ++importMealsPageMountGen;
    return () => {
      window.setTimeout(() => {
        if (gen === importMealsPageMountGen) {
          useImportMealsStore.getState().clear();
        }
      }, 0);
    };
  }, []);

  const handleBack = () => {
    clear();
    navigate('/settings');
  };

  const handleConfirm = () => {
    setBusy(true);
    try {
      const { added } = commitImport();
      toast.success(`Добавлено ${added}`);
      navigate('/settings');
    } finally {
      setBusy(false);
    }
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <SubpageShell
      title="Импорт еды"
      onBack={handleBack}
      mainClassName="flex min-h-0 flex-col"
    >
      <ImportMealsPreview
        rows={rows}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={handleBack}
      />
    </SubpageShell>
  );
}
