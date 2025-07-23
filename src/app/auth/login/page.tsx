// ========================================
// PAGE DE CONNEXION
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ========================================
// SCHÉMA DE VALIDATION
// ========================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  totpCode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{6}$/.test(val), {
      message: 'Le code doit contenir 6 chiffres',
    }),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ========================================
// COMPOSANT PAGE DE CONNEXION
// ========================================

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      totpCode: '',
    },
  });

  // ========================================
  // GESTION DE LA SOUMISSION
  // ========================================

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    clearErrors();

    try {
      const response = await authService.login(
        data.email,
        data.password,
        data.totpCode
      );

      // Connexion réussie
      if (response.success) {
        const { user, tokens } = response.data;
        
        // Récupérer les entreprises de l'utilisateur
        // Pour le moment, on simule avec l'entreprise de l'utilisateur
        const companies = [
          {
            id: user.companyId,
            name: user.role?.name?.includes('ACME') ? 'ACME Corp' : 'Entreprise',
            slug: 'company',
            plan: 'enterprise' as const,
            status: 'active' as const,
            settings: {
              branding: {
                primaryColor: '#1E40AF',
                secondaryColor: '#3B82F6',
                companyName: 'ACME Corp',
              },
              activeServices: ['auth', 'users', 'settings'],
              businessRules: {},
              regional: {
                timezone: 'Europe/Paris',
                currency: 'EUR',
                locale: 'fr-FR',
                dateFormat: 'DD/MM/YYYY',
              },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        login(user, tokens, companies);
        
        toast.success('Connexion réussie', {
          description: `Bienvenue ${user.firstName} ${user.lastName}`,
        });

        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);

      // Gestion des erreurs spécifiques
      if (error.response?.status === 401) {
        const errorData = error.response.data;
        
        if (errorData.error?.code === 'TWO_FACTOR_REQUIRED') {
          setRequiresTwoFactor(true);
          toast.info('Code 2FA requis', {
            description: 'Veuillez saisir votre code d\'authentification à deux facteurs',
          });
          return;
        }

        if (errorData.error?.code === 'INVALID_TOTP_CODE') {
          setError('totpCode', {
            type: 'manual',
            message: 'Code 2FA invalide',
          });
          return;
        }

        setError('password', {
          type: 'manual',
          message: 'Email ou mot de passe incorrect',
        });
      } else if (error.response?.status === 423) {
        toast.error('Compte verrouillé', {
          description: 'Votre compte a été temporairement verrouillé suite à trop de tentatives de connexion',
        });
      } else {
        toast.error('Erreur de connexion', {
          description: error.response?.data?.error?.message || 'Une erreur est survenue lors de la connexion',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // RENDU DU COMPOSANT
  // ========================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">SaaS App</h1>
          <p className="text-muted-foreground">
            Connectez-vous à votre compte
          </p>
        </div>

        {/* Formulaire de connexion */}
        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              {requiresTwoFactor
                ? 'Saisissez votre code d\'authentification à deux facteurs'
                : 'Saisissez vos identifiants pour accéder à votre compte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              {!requiresTwoFactor && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                  </div>
                </div>
              )}

              {/* Mot de passe */}
              {!requiresTwoFactor && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      error={errors.password?.message}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Code 2FA */}
              {requiresTwoFactor && (
                <div className="space-y-2">
                  <Label htmlFor="totpCode">Code d'authentification</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="totpCode"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pl-10 text-center text-lg tracking-widest"
                      error={errors.totpCode?.message}
                      {...register('totpCode')}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saisissez le code à 6 chiffres de votre application d'authentification
                  </p>
                </div>
              )}

              {/* Bouton de connexion */}
              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>

              {/* Lien mot de passe oublié */}
              {!requiresTwoFactor && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push('/auth/forgot-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {/* Retour à la connexion */}
              {requiresTwoFactor && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresTwoFactor(false);
                      clearErrors();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    ← Retour à la connexion
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Comptes de test */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Comptes de test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <strong>Super Admin:</strong> superadmin@saas-app.com / admin123
            </div>
            <div>
              <strong>ACME Admin:</strong> admin@acme-corp.com / admin123
            </div>
            <div>
              <strong>ACME Manager:</strong> manager@acme-corp.com / admin123
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          © 2024 SaaS App. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}

