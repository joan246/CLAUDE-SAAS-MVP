import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role?: 'ADMIN' | 'STAFF';
  companyId?: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  // Try to load from localStorage on client side
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return {
          token: storedToken,
          user,
          setAuth: (token: string, user: User) => {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(user));
            set({ token, user });
          },
          clearAuth: () => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            set({ token: null, user: null });
          },
        };
      } catch {
        // Continue with empty state
      }
    }
  }

  return {
    token: null,
    user: null,
    setAuth: (token: string, user: User) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
      set({ token, user });
    },
    clearAuth: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
      set({ token: null, user: null });
    },
  };
});
