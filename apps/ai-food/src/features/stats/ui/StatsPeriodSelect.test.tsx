import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatsPeriodSelect } from './StatsPeriodSelect';

describe('StatsPeriodSelect', () => {
  it('opens a themed menu with all period options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatsPeriodSelect value="halfYear" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Период статистики' }));

    expect(screen.getByRole('option', { name: 'Неделя' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Месяц' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3 месяца' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Полгода' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Год' })).toBeInTheDocument();
  });

  it('selects a period and closes the menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatsPeriodSelect value="week" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Период статистики' }));
    await user.click(screen.getByRole('option', { name: 'Год' }));

    expect(onChange).toHaveBeenCalledWith('year');
    expect(screen.queryByRole('option', { name: 'Год' })).not.toBeInTheDocument();
  });
});
