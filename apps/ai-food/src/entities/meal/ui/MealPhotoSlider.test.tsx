import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MealPhotoSlider } from './MealPhotoSlider';

const useMealImages = vi.fn();

vi.mock('../model/useMealImages', () => ({
  useMealImages: (...args: unknown[]) => useMealImages(...args),
}));

describe('MealPhotoSlider', () => {
  it('renders nothing when there are no photo URIs', () => {
    useMealImages.mockReturnValue({ srcs: [], settled: true });
    const { container } = render(<MealPhotoSlider imageUris={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when load settled and photos are missing', () => {
    useMealImages.mockReturnValue({ srcs: [null], settled: true });
    const { container } = render(
      <MealPhotoSlider imageUris={['meal-images/gone.jpg']} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows a placeholder while photos are loading', () => {
    useMealImages.mockReturnValue({ srcs: [null], settled: false });
    const { container } = render(
      <MealPhotoSlider imageUris={['meal-images/a.jpg']} />,
    );
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders a photo when a src is ready', () => {
    useMealImages.mockReturnValue({
      srcs: ['blob:mock-photo'],
      settled: true,
    });
    const { container } = render(
      <MealPhotoSlider imageUris={['meal-images/a.jpg']} />,
    );
    expect(screen.getByRole('button', { name: 'Открыть фото' })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'blob:mock-photo',
    );
  });

  it('hides the block when the only photo fails to display', () => {
    useMealImages.mockReturnValue({
      srcs: ['blob:broken'],
      settled: true,
    });
    const { container } = render(
      <MealPhotoSlider imageUris={['meal-images/a.jpg']} />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(container.firstChild).toBeNull();
  });
});
