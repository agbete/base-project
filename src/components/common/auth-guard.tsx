// ========================================
// GARDE D'AUTHENTIFICATION
// ========================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  fallbackUrl?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredPermissions = [],
  fallbackUrl = '/auth/login'
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, hasAllPermissions } = useAuthStore();

  useEffect(() => {
    // Si l'authentification est requise mais l'utilisateur n'est pas connecté
    if (requireAuth && !isAuthenticated) {
      router.replace(fallbackUrl);
      return;
    }

    // Si des permissions spécifiques sont requises
    if (requireAuth && isAuthenticated && requiredPermissions.length > 0) {
      if (!hasAllPermissions(requiredPermissions)) {
        router.replace('/dashboard/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, user, requireAuth, requiredPermissions, router, fallbackUrl, hasAllPermissions]);

  // Afficher un loader pendant la vérification
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Vérifier les permissions
  if (requireAuth && isAuthenticated && requiredPermissions.length > 0) {
    if (!hasAllPermissions(requiredPermissions)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-destructive text-xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Accès non autorisé</h2>
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

