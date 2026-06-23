import { create } from 'zustand';

interface ImageState {
  selectedImage: File | null;
  previewUrl: string | null;
  setImage: (file: File) => void;
  clear: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  selectedImage: null,
  previewUrl: null,
  setImage: (file) => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: file, previewUrl: URL.createObjectURL(file) });
  },
  clear: () => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: null, previewUrl: null });
  },
}));
