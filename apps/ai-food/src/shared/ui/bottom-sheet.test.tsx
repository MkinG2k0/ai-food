import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './bottom-sheet';

describe('BottomSheet', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} portal={false}>
        <p>Content</p>
      </BottomSheet>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes a drag handle for dismiss gestures', () => {
    render(
      <BottomSheet open onClose={() => undefined} portal={false}>
        <div data-testid="sheet-body">Body</div>
      </BottomSheet>,
    );

    expect(document.querySelector('[data-bottom-sheet-handle]')).not.toBeNull();
    expect(screen.getByTestId('sheet-body')).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet open onClose={onClose} portal={false}>
        <p>Content</p>
      </BottomSheet>,
    );

    const backdrop = container.querySelector('.bg-black\\/40');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
