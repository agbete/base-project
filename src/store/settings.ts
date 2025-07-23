// ========================================
// STORE ZUSTAND POUR LES PARAMÈTRES
// ========================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserPreferences, CompanySettings, SystemSettings } from '@/types';

interface SettingsState {
  // Préférences utilisateur
  userPreferences: UserPreferences;
  
  // Paramètres de l'entreprise courante
  companySettings: CompanySettings | null;
  
  // Paramètres système (pour super admin)
  systemSettings: SystemSettings | null;
  
  // État de chargement
  isLoading: boolean;
  
  // Actions
  setUserPreferences: (preferences: Partial<UserPreferences>) => void;
  setCompanySettings: (settings: CompanySettings | null) => void;
  setSystemSettings: (settings: SystemSettings | null) => void;
  setLoading: (loading: boolean) => void;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateLanguage: (language: string) => void;
  updateTimezone: (timezone: string) => void;
  updateNotifications: (notifications: Partial<UserPreferences['notifications']>) => void;
  reset: () => void;
}

const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'fr',
  timezone: 'Europe/Paris',
  notifications: {
    email: true,
    push: true,
    desktop: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // État initial
      userPreferences: defaultUserPreferences,
      companySettings: null,
      systemSettings: null,
      isLoading: false,

      // Actions
      setUserPreferences: (preferences) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            ...preferences,
          },
        }));
      },

      setCompanySettings: (settings) => {
        set({ companySettings: settings });
      },

      setSystemSettings: (settings) => {
        set({ systemSettings: settings });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      updateTheme: (theme) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            theme,
          },
        }));
      },

      updateLanguage: (language) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            language,
          },
        }));
      },

      updateTimezone: (timezone) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            timezone,
          },
        }));
      },

      updateNotifications: (notifications) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            notifications: {
              ...state.userPreferences.notifications,
              ...notifications,
            },
          },
        }));
      },

      reset: () => {
        set({
          userPreferences: defaultUserPreferences,
          companySettings: null,
          systemSettings: null,
          isLoading: false,
        });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userPreferences: state.userPreferences,
      }),
    }
  )
);

