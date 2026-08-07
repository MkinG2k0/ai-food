import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ImageIcon, X, Zap, ZapOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarcodeProductConfirm,
  BarcodeScanner,
  OffProductError,
  normalizeBarcode,
  useProductByBarcode,
  useSaveBarcodeMeal,
} from '@/features/scan-barcode';
import { useSaveMeal } from '@/features/save-meal';
import { TextareaWithVoice, Button } from '@/shared/ui';
import { AI_IMAGE_MAX_SIDE, cn } from '@/shared/lib';
import { captureVideoFrame } from '../lib/captureVideoFrame';
import { createCaptureLock } from '../lib/createCaptureLock';

type ScanMode = 'food' | 'barcode';

export function ScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode: ScanMode =
    searchParams.get('mode') === 'barcode' ? 'barcode' : 'food';
  /** When true, after photo ask for text (+ voice). When false — analyze photo immediately. */
  const requireDescription = searchParams.get('describe') === '1';

  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const captureLockRef = useRef(createCaptureLock());

  const submitFood = useSaveMeal();
  const saveBarcodeMeal = useSaveBarcodeMeal();
  const { data, error, isFetching, isSuccess, isError } =
    useProductByBarcode(lookupCode);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startFoodCamera = useCallback(async () => {
    setCameraError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.srcObject = stream;
        // Android WebView may need metadata before play; avoid leaving paused overlay.
        if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve) => {
            const onReady = () => {
              cleanup();
              resolve();
            };
            const timer = window.setTimeout(onReady, 1500);
            const cleanup = () => {
              window.clearTimeout(timer);
              video.removeEventListener('loadedmetadata', onReady);
            };
            video.addEventListener('loadedmetadata', onReady);
          });
        }
        await video.play().catch(() => undefined);
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      setTorchSupported(Boolean(capabilities?.torch));
    } catch {
      setCameraError('Камера недоступна');
      toast.error('Не удалось открыть камеру');
    }
  }, [stopStream]);

  useEffect(() => {
    if (mode !== 'food' || pendingPhoto) {
      stopStream();
      return;
    }
    void startFoodCamera();
    return () => stopStream();
  }, [mode, pendingPhoto, startFoodCamera, stopStream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isError || !error) return;
    const message =
      error instanceof OffProductError
        ? error.message
        : 'Не удалось загрузить продукт';
    toast.error(message);
    setLookupCode(null);
  }, [isError, error]);

  const handleClose = () => {
    stopStream();
    navigate(-1);
  };

  const handleModeChange = (next: ScanMode) => {
    if (next === mode) return;
    captureLockRef.current.unlock();
    setCapturing(false);
    setLookupCode(null);
    setManualCode('');
    setPendingPhoto(null);
    setDescription('');
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setMode(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      toast.message('Вспышка недоступна на этом устройстве');
    }
  };

  const acceptFoodFile = (file: File) => {
    stopStream();
    if (!requireDescription) {
      void submitFood({ image: file });
      navigate('/');
      return;
    }
    setPendingPhoto(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setDescription('');
  };

  const handleShutter = async () => {
    if (cameraError) return;

    await captureLockRef.current.run(async () => {
      setCapturing(true);
      const video = videoRef.current;
      if (!video) {
        captureLockRef.current.unlock();
        setCapturing(false);
        return;
      }
      const file = await captureVideoFrame(video, {
        maxSide: AI_IMAGE_MAX_SIDE,
      });
      if (!file) {
        captureLockRef.current.unlock();
        setCapturing(false);
        toast.error('Не удалось сделать снимок');
        return;
      }
      acceptFoodFile(file);
    });
  };

  const handleGalleryChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (capturing) return;
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    setCapturing(true);
    acceptFoodFile(file);
  };

  const handleSubmitFood = () => {
    if (!pendingPhoto || !description.trim()) return;
    const image = pendingPhoto;
    const text = description.trim();
    setPendingPhoto(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    void submitFood({ image, description: text });
    navigate('/');
  };

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

  const handleConfirmBarcode = async (grams: number) => {
    if (!data) return;
    setSavingBarcode(true);
    try {
      await saveBarcodeMeal(data, grams);
      toast.success('Добавлено в дневник');
      navigate('/');
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSavingBarcode(false);
    }
  };

  const showBarcodeConfirm =
    mode === 'barcode' && Boolean(lookupCode) && isSuccess && data && !isFetching;

  if (showBarcodeConfirm && data) {
    return (
      <div className="flex h-svh flex-col bg-background">
        <header className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLookupCode(null)}
            aria-label="Назад"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Штрихкод</h1>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <BarcodeProductConfirm
            product={data}
            onConfirm={handleConfirmBarcode}
            onCancel={() => setLookupCode(null)}
            saving={savingBarcode}
          />
        </main>
      </div>
    );
  }

  if (pendingPhoto && previewUrl) {
    return (
      <div className="flex h-svh flex-col bg-background">
        <header className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              captureLockRef.current.unlock();
              setCapturing(false);
              setPendingPhoto(null);
              setDescription('');
              setPreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
              });
            }}
            aria-label="Назад"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Камера + Описание</h1>
        </header>
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
          <img
            src={previewUrl}
            alt="Снимок блюда"
            className="h-48 w-full rounded-xl object-cover"
          />
          <TextareaWithVoice
            placeholder="Напр.: куриный салат с рисом, без соуса"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-28 resize-none"
            autoFocus
          />
          <Button
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleSubmitFood}
            disabled={!description.trim()}
          >
            Отправить
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative h-svh overflow-hidden bg-black text-white">
      <button
        type="button"
        onClick={handleClose}
        className="absolute left-4 top-safe z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40"
        aria-label="Закрыть"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute inset-0">
        {mode === 'food' ? (
          cameraError ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
              {cameraError}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="camera-preview h-full w-full object-cover"
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                disableRemotePlayback
                controls={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                // Legacy iOS/Android WebView inline playback (React camelCase misses this).
                {...{ 'webkit-playsinline': 'true' }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-64">
                  <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white" />
                  <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white" />
                  <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-white" />
                  <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-white" />
                </div>
              </div>
            </>
          )
        ) : (
          <div className="flex h-full flex-col justify-center gap-4 px-4 pb-40 pt-16">
            <BarcodeScanner
              onScan={handleScan}
              paused={Boolean(lookupCode) && isFetching}
            />
            {isFetching ? (
              <p className="text-center text-sm text-white/80">Поиск продукта…</p>
            ) : null}
            <div className="space-y-2 rounded-xl bg-black/50 p-3">
              <label className="block space-y-1.5">
                <span className="text-sm text-white/80">Или введите код</span>
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
                  className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </label>
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleManualSubmit}
                disabled={isFetching}
              >
                Найти
              </Button>
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-5 px-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex rounded-full bg-black/55 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => handleModeChange('food')}
            className={cn(
              'rounded-full px-5 py-2 transition-colors',
              mode === 'food' ? 'bg-white text-black' : 'text-white/80',
            )}
          >
            Еда
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('barcode')}
            className={cn(
              'rounded-full px-5 py-2 transition-colors',
              mode === 'barcode' ? 'bg-white text-black' : 'text-white/80',
            )}
          >
            Штрихкод
          </button>
        </div>

        {mode === 'food' ? (
          <div className="flex w-full max-w-sm items-center justify-between">
            <button
              type="button"
              onClick={() => void toggleTorch()}
              disabled={!torchSupported}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full bg-black/45',
                !torchSupported && 'opacity-40',
              )}
              aria-label={torchOn ? 'Выключить вспышку' : 'Включить вспышку'}
            >
              {torchOn ? (
                <Zap className="h-5 w-5" />
              ) : (
                <ZapOff className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleShutter()}
              disabled={Boolean(cameraError) || capturing}
              className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white/80 bg-white disabled:opacity-40"
              style={{ height: '4.5rem', width: '4.5rem' }}
              aria-label="Сфотографировать"
              aria-busy={capturing}
            >
              <span
                className={cn(
                  'h-14 w-14 rounded-full bg-white transition-opacity',
                  capturing && 'opacity-50',
                )}
              />
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={capturing}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 disabled:opacity-40"
              aria-label="Галерея"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <p className="pb-2 text-center text-sm text-white/70">
            Наведите камеру на штрихкод
          </p>
        )}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
        aria-label="Выбор из галереи"
      />
    </div>
  );
}
