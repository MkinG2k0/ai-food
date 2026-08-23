import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}));

import { extractPdfText } from './pdfText';

describe('extractPdfText', () => {
  beforeEach(() => {
    getDocument.mockReset();
  });

  it('groups text items into lines by Y and orders each line by X', async () => {
    const getPage = vi.fn().mockResolvedValue({
      getTextContent: vi.fn().mockResolvedValue({
        items: [
          { str: '12:30', transform: [1, 0, 0, 1, 80, 700] },
          { str: 'Завтрак', transform: [1, 0, 0, 1, 10, 700.4] },
          { str: '500 ккал', transform: [1, 0, 0, 1, 10, 680] },
          { type: 'beginMarkedContent' },
        ],
      }),
    });
    getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage }),
    });

    await expect(extractPdfText(new ArrayBuffer(1))).resolves.toBe(
      'Завтрак 12:30\n500 ккал',
    );
  });

  it('separates pages with a newline', async () => {
    const getPage = vi
      .fn()
      .mockResolvedValueOnce({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Первая', transform: [1, 0, 0, 1, 10, 700] }],
        }),
      })
      .mockResolvedValueOnce({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Вторая', transform: [1, 0, 0, 1, 10, 700] }],
        }),
      });
    getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage }),
    });

    await expect(extractPdfText(new ArrayBuffer(1))).resolves.toBe(
      'Первая\nВторая',
    );
  });
});
