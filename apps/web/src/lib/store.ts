import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id?: string;
  userId: string;
  email: string;
  phone?: string | null;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  accountType?: 'PERSONAL' | 'BUSINESS';
  businessName?: string | null;
  businessCategory?: string | null;
  businessDescription?: string | null;
  businessHours?: string | null;
  businessAddress?: string | null;
  businessWebsite?: string | null;
  businessUpiId?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (fields: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...fields } : null,
        })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'nexo-auth-storage',
      // only store the token and user data in localStorage
    }
  )
);
