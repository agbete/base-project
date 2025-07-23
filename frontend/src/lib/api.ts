// ========================================
// CONFIGURATION ET CLIENT API
// ========================================

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

// ========================================
// CONFIGURATION DE BASE
// ========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Instance Axios principale
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========================================
// INTERCEPTEURS DE REQUÊTE
// ========================================

apiClient.interceptors.request.use(
  (config) => {
    // Ajouter le token d'authentification
    const token = useAuthStore.getState().tokens?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ajouter l'ID de l'entreprise courante
    const currentCompany = useAuthStore.getState().currentCompany;
    if (currentCompany) {
      config.headers['X-Tenant-ID'] = currentCompany.id;
    }

    // Log des requêtes en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ========================================
// INTERCEPTEURS DE RÉPONSE
// ========================================

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log des réponses en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Gestion des erreurs 401 (token expiré)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().tokens?.refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { tokens } = response.data.data;
          useAuthStore.getState().setTokens(tokens);

          // Retry la requête originale avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Échec du refresh, déconnecter l'utilisateur
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    // Gestion des autres erreurs
    const errorMessage = error.response?.data?.error?.message || error.message || 'Une erreur est survenue';
    
    // Afficher les erreurs sauf pour certains cas spécifiques
    if (error.response?.status !== 401 && !originalRequest.skipErrorToast) {
      toast.error('Erreur', {
        description: errorMessage,
      });
    }

    console.error('❌ API Error:', {
      status: error.response?.status,
      message: errorMessage,
      url: error.config?.url,
      method: error.config?.method,
    });

    return Promise.reject(error);
  }
);

// ========================================
// TYPES POUR LES RÉPONSES API
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========================================
// MÉTHODES UTILITAIRES
// ========================================

class ApiService {
  // GET request
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data.data as T;
  }

  // POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  // PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  // PATCH request
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  // DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    return response.data.data as T;
  }

  // Upload de fichier
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await apiClient.post<ApiResponse<T>>(url, formData, config);
    return response.data.data as T;
  }

  // Download de fichier
  async download(url: string, filename?: string): Promise<void> {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// ========================================
// SERVICES SPÉCIALISÉS
// ========================================

export class AuthService extends ApiService {
  async login(email: string, password: string, totpCode?: string) {
    return this.post('/api/auth/login', { email, password, totpCode });
  }

  async logout() {
    return this.post('/api/auth/logout');
  }

  async refreshToken(refreshToken: string) {
    return this.post('/api/auth/refresh', { refreshToken });
  }

  async forgotPassword(email: string) {
    return this.post('/api/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.post('/api/auth/reset-password', { token, password });
  }

  async setup2FA() {
    return this.post('/api/auth/setup-2fa');
  }

  async verify2FA(totpCode: string) {
    return this.post('/api/auth/verify-2fa', { totpCode });
  }

  async disable2FA(password: string) {
    return this.post('/api/auth/disable-2fa', { password });
  }
}

export class UsersService extends ApiService {
  async getUsers(params?: any) {
    return this.get<PaginatedResponse<any>>('/api/users', { params });
  }

  async getUser(id: string) {
    return this.get(`/api/users/${id}`);
  }

  async createUser(data: any) {
    return this.post('/api/users', data);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/api/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.delete(`/api/users/${id}`);
  }

  async updateProfile(data: any) {
    return this.put('/api/users/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.post('/api/users/change-password', { currentPassword, newPassword });
  }
}

export class CompaniesService extends ApiService {
  async getCompanies(params?: any) {
    return this.get<PaginatedResponse<any>>('/api/companies', { params });
  }

  async getCompany(id: string) {
    return this.get(`/api/companies/${id}`);
  }

  async createCompany(data: any) {
    return this.post('/api/companies', data);
  }

  async updateCompany(id: string, data: any) {
    return this.put(`/api/companies/${id}`, data);
  }

  async deleteCompany(id: string) {
    return this.delete(`/api/companies/${id}`);
  }
}

export class RolesService extends ApiService {
  async getRoles(params?: any) {
    return this.get('/api/roles', { params });
  }

  async getRole(id: string) {
    return this.get(`/api/roles/${id}`);
  }

  async createRole(data: any) {
    return this.post('/api/roles', data);
  }

  async updateRole(id: string, data: any) {
    return this.put(`/api/roles/${id}`, data);
  }

  async deleteRole(id: string) {
    return this.delete(`/api/roles/${id}`);
  }
}

export class PermissionsService extends ApiService {
  async getPermissions(params?: any) {
    return this.get('/api/permissions', { params });
  }
}

export class SettingsService extends ApiService {
  async getCompanySettings() {
    return this.get('/api/settings/company');
  }

  async updateCompanySettings(data: any) {
    return this.put('/api/settings/company', data);
  }

  async getUserSettings() {
    return this.get('/api/settings/user');
  }

  async updateUserSettings(data: any) {
    return this.put('/api/settings/user', data);
  }

  async getSystemSettings() {
    return this.get('/api/settings/system');
  }

  async updateSystemSettings(data: any) {
    return this.put('/api/settings/system', data);
  }
}

// ========================================
// INSTANCES DES SERVICES
// ========================================

export const api = new ApiService();
export const authService = new AuthService();
export const usersService = new UsersService();
export const companiesService = new CompaniesService();
export const rolesService = new RolesService();
export const permissionsService = new PermissionsService();
export const settingsService = new SettingsService();

// Export de l'instance Axios pour les cas spéciaux
export { apiClient };

// ========================================
// UTILITAIRES POUR REACT QUERY
// ========================================

export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  companies: ['companies'] as const,
  company: (id: string) => ['companies', id] as const,
  roles: ['roles'] as const,
  role: (id: string) => ['roles', id] as const,
  permissions: ['permissions'] as const,
  settings: {
    company: ['settings', 'company'] as const,
    user: ['settings', 'user'] as const,
    system: ['settings', 'system'] as const,
  },
} as const;

