import { ImageResponse } from 'next/og';

export const alt = 'AI Food — калории и БЖУ по фото';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #1a2f23 0%, #2d4a38 45%, #5b8a72 100%)',
          color: '#f4f8f5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: '#97b03e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              color: '#15261c',
            }}
          >
            AI
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>
            AI Food
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            Сфотографировал. Уже знаешь КБЖУ.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: '#d8e8de',
              maxWidth: 820,
            }}
          >
            Анализ тарелки за секунды — калории, белки, жиры и углеводы
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
