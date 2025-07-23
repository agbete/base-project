// ========================================
// TYPES TYPESCRIPT POUR L'APPLICATION
// ========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive' | 'locked';
  companyId: string;
  roleId: string;
  role: Role;
  isTwoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  service: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
}

export interface CompanySettings {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
  };
  activeServices: string[];
  businessRules: Record<string, any>;
  regional: {
    timezone: string;
    currency: string;
    locale: string;
    dateFormat: string;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

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

export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
  value: any;
  label?: string;
}

export interface DataTableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataTableState {
  page: number;
  limit: number;
  search: string;
  filters: DataTableFilter[];
  sort: DataTableSort[];
}

export interface TwoFactorSetup {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface SystemSettings {
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  features: {
    twoFactorRequired: boolean;
    passwordResetEnabled: boolean;
    registrationEnabled: boolean;
  };
  limits: {
    maxUsersPerCompany: Record<string, number>;
    maxStoragePerCompany: Record<string, string>;
    rateLimits: Record<string, number>;
  };
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  href?: string;
  children?: MenuItem[];
  permission?: string;
  badge?: string | number;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    muted: string;
    accent: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
  };
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  permissions: string[];
}

// Utilitaires de type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Types pour les formulaires
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'textarea' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: any;
}

export interface FormConfig {
  fields: FormField[];
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

// Types pour les modales
export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Types pour les toasts
export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

