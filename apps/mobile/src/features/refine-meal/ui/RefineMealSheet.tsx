import { useState } from 'react';
import { BottomSheet, Button, Textarea } from '@/shared/ui';

export interface RefineMealSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (correction: string) => void;
}

export function RefineMealSheet({ open, onClose, onSubmit }: RefineMealSheetProps) {
  const [text, setText] = useState('');

  const handleClose = () => {
    setText('');
    onClose();
  };

  const handleSubmit = () => {
    const correction = text.trim();
    if (!correction) return;
    setText('');
    onClose();
    onSubmit(correction);
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="w-full space-y-4 px-2 py-2">
        <h2 className="text-lg font-semibold text-foreground">Дополнить</h2>

        <Textarea
          placeholder="Напр.: съел половину / котлета не куриная а мясная"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-32 resize-none"
        />

        <Button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Применить
        </Button>
      </div>
    </BottomSheet>
  );
}
