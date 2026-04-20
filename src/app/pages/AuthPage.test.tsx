import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';

const authState = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  error: null as string | null,
};

vi.mock('../store/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('AuthPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authState.signIn.mockReset();
    authState.signUp.mockReset();
    authState.error = null;
    authState.signIn.mockResolvedValue(true);
    authState.signUp.mockResolvedValue(true);
  });

  it('shows invite code field only in signup mode', () => {
    render(<AuthPage />);

    expect(screen.queryByPlaceholderText('输入邀请码')).toBeNull();

    fireEvent.click(screen.getByText('邀请码注册'));

    expect(screen.getByPlaceholderText('输入邀请码')).toBeTruthy();
  });

  it('blocks signup without invite code', async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByText('邀请码注册'));
    fireEvent.change(screen.getByPlaceholderText('输入你的昵称'), { target: { value: 'Yuchao' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('至少 6 个字符'), { target: { value: '123456' } });

    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(authState.signUp).not.toHaveBeenCalled();
      expect(screen.getByText('请输入邀请码')).toBeTruthy();
    });
  });

  it('passes normalized invite code to signup', async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByText('邀请码注册'));
    fireEvent.change(screen.getByPlaceholderText('输入你的昵称'), { target: { value: 'Yuchao' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('至少 6 个字符'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('输入邀请码'), { target: { value: ' beta-001 ' } });

    fireEvent.click(screen.getByRole('button', { name: '创建账号' }));

    await waitFor(() => {
      expect(authState.signUp).toHaveBeenCalledWith(
        'user@example.com',
        '123456',
        'Yuchao',
        'BETA-001',
      );
    });
  });
});
