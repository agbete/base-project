// ========================================
// STORE ZUSTAND POUR L'AUTHENTIFICATION
// ========================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Company, AuthTokens } from '@/types';

interface AuthState {
  // État
  user: User | null;
  tokens: AuthTokens | null;
  currentCompany: Company | null;
  companies: Company[];
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setCurrentCompany: (company: Company | null) => void;
  setCompanies: (companies: Company[]) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, tokens: AuthTokens, companies: Company[]) => void;
  logout: () => void;
  switchCompany: (companyId: string) => void;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      tokens: null,
      currentCompany: null,
      companies: [],
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      setTokens: (tokens) => {
        set({ tokens });
      },

      setCurrentCompany: (company) => {
        set({ currentCompany: company });
      },

      setCompanies: (companies) => {
        set({ companies });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      login: (user, tokens, companies) => {
        const currentCompany = companies.length > 0 ? companies[0] : null;
        
        set({
          user,
          tokens,
          companies,
          currentCompany,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          currentCompany: null,
          companies: [],
          isAuthenticated: false,
          isLoading: false,
        });
      },

      switchCompany: (companyId) => {
        const { companies } = get();
        const company = companies.find(c => c.id === companyId);
        if (company) {
          set({ currentCompany: company });
        }
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user || !user.role) return false;
        
        const permissions = user.role.permissions || [];
        return permissions.includes(permission) || permissions.includes('*');
      },

      hasAnyPermission: (permissions) => {
        return permissions.some(permission => get().hasPermission(permission));
      },

      hasAllPermissions: (permissions) => {
        return permissions.every(permission => get().hasPermission(permission));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        currentCompany: state.currentCompany,
        companies: state.companies,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

