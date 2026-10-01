import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  totalPoints: number;
  avatarUrl?: string | null;
  showInLeaderboard?: boolean;
  role?: 'STUDENT' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  setUser: (u: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));