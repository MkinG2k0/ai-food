# 260806-vce — Unified scan (food/barcode) + voice input

## Goal

Merge camera + barcode into one CalZen-style capture screen; add voice dictation on all free-text fields.

## Done

- `/scan` page: live camera, toggle **Еда | Штрихкод**, shutter / gallery / torch, optional description+mic after photo
- AddFoodSheet menu: **Камера / Штрихкод**, Галерея, Описать, Вручную, Избранное (removed separate camera+describe and barcode rows)
- `/barcode` → redirect to `/scan?mode=barcode`
- `TextareaWithVoice` + Capgo speech (native) / Web Speech API (web)
- Voice on: Описать, photo describe, RefineMeal, meal ask, settings custom instructions
- Android: `RECORD_AUDIO` (+ `MODIFY_AUDIO_SETTINGS`)

## Verify

- [ ] FAB → Камера / Штрихкод → toggle modes
- [ ] Food shutter → optional description with mic → analyze
- [ ] Barcode mode → OFF product confirm
- [ ] Mic on Описать / Уточнить / Вопрос по блюду (Chrome or Android build)
