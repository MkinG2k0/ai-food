import { create } from 'zustand';

interface ImageState {
  selectedImage: File | null;
  previewUrl: string | null;
  description: string | null;
  setImage: (file: File) => void;
  setDescription: (text: string) => void;
  clear: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  selectedImage: null,
  previewUrl: null,
  description: null,
  setImage: (file) => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: file, previewUrl: URL.createObjectURL(file) });
  },
  setDescription: (text) => {
    set({ description: text });
  },
  clear: () => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ selectedImage: null, previewUrl: null, description: null });
  },
}));
