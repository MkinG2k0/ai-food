import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.fn();
const getAuthState = vi.fn();

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

import {
  handleQuotaExceeded,
  isQuotaExceededError,
  quotaExceededPath,
  showGenerationQuotaPaywall,
} from './quotaPaywall';

describe('quotaPaywall', () => {
  beforeEach(() => {
    toastError.mockReset();
    getAuthState.mockReturnValue({ userToken: null });
  });

  it('detects QUOTA_EXCEEDED code and 402 status', () => {
    expect(isQuotaExceededError({ code: 'QUOTA_EXCEEDED', status: 403 })).toBe(
      true,
    );
    expect(isQuotaExceededError({ code: 'OTHER', status: 402 })).toBe(true);
    expect(isQuotaExceededError({ code: 'OTHER', status: 400 })).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });

  it('routes guest to /login and auth to /subscribe', () => {
    getAuthState.mockReturnValue({ userToken: null });
    expect(quotaExceededPath()).toBe('/login');
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    expect(quotaExceededPath()).toBe('/subscribe');
  });

  it('navigates for quota errors and returns false for others', () => {
    const navigate = vi.fn();
    getAuthState.mockReturnValue({ userToken: null });

    expect(handleQuotaExceeded({ code: 'OTHER', status: 500 }, navigate)).toBe(
      false,
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();

    expect(
      handleQuotaExceeded(
        { code: 'QUOTA_EXCEEDED', status: 402, message: 'Лимит' },
        navigate,
      ),
    ).toBe(true);
    expect(toastError).toHaveBeenCalledWith('Лимит');
    expect(navigate).toHaveBeenCalledWith('/login');

    navigate.mockClear();
    toastError.mockClear();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    expect(handleQuotaExceeded({ status: 402 }, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/subscribe');
  });

  it('showGenerationQuotaPaywall routes guest to login', () => {
    const navigate = vi.fn();
    getAuthState.mockReturnValue({ userToken: null });

    showGenerationQuotaPaywall(navigate);

    expect(toastError).toHaveBeenCalledWith(
      'Лимит бесплатных генераций исчерпан. Войдите через Telegram.',
    );
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
