import { create } from 'zustand';
import Cookies from 'js-cookie';

interface AuthState {
  token: string | null;
  user: { email: string; role: string } | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: { email: string; role: string }) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    Cookies.set('token', token, { expires: 7 });
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    Cookies.remove('token');
    set({ token: null, user: null, isAuthenticated: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  initialize: () => {
    const token = Cookies.get('token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));
