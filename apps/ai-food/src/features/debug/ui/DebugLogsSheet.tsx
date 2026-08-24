import { useEffect, useState } from 'react';
import { ClipboardCopy, Send } from 'lucide-react';
import { BottomSheet, Button } from '@/shared/ui';
import {
  buildAppDebugReport,
  clearAppDebugLog,
  copyAppDebugReport,
  shareAppDebugReportViaTelegram,
  subscribeAppDebugLog,
} from '@/shared/lib/appDebugLog';

interface DebugLogsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function DebugLogsSheet({ open, onClose }: DebugLogsSheetProps) {
  const [report, setReport] = useState(buildAppDebugReport);

  useEffect(() => {
    return subscribeAppDebugLog(() => {
      setReport(buildAppDebugReport());
    });
  }, []);

  useEffect(() => {
    if (open) {
      setReport(buildAppDebugReport());
    }
  }, [open]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Debug-логи</h2>
        <p className="text-xs text-muted-foreground">
          События shutter → encode → AI → sync. Логи хранятся только на устройстве.
        </p>
        <pre className="max-h-[50vh] overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
          {report}
        </pre>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void copyAppDebugReport()}
          >
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Скопировать
          </Button>
          <Button
            className="w-full"
            onClick={() => void shareAppDebugReportViaTelegram()}
          >
            <Send className="mr-2 h-4 w-4" />
            Скопировать и отправить
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => {
            clearAppDebugLog();
            setReport(buildAppDebugReport());
          }}
        >
          Очистить лог
        </Button>
      </div>
    </BottomSheet>
  );
}
