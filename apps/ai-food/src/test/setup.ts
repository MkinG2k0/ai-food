import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return {
    ...actual,
    registerPlugin: vi.fn(() => ({})),
  };
});

// jsdom does not implement URL.createObjectURL / revokeObjectURL
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = (_blob: Blob) => `blob:mock-${Math.random()}`;
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {};
}

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
