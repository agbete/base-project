// ========================================
// HEADER DU DASHBOARD
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
  Building2,
  Search,
  Menu,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/lib/api';

export function DashboardHeader() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, currentCompany, companies, logout, switchCompany } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await authService.logout();
      logout();
      toast.success('Déconnexion réussie');
      router.push('/auth/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Déconnecter quand même côté client
      logout();
      router.push('/auth/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCompanySwitch = (companyId: string) => {
    switchCompany(companyId);
    setShowCompanySelector(false);
    toast.success('Entreprise changée', {
      description: `Vous travaillez maintenant pour ${companies.find(c => c.id === companyId)?.name}`,
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Côté gauche - Recherche */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher..."
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {/* Côté droit - Actions */}
        <div className="flex items-center space-x-4">
          {/* Sélecteur d'entreprise */}
          {companies.length > 1 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompanySelector(!showCompanySelector)}
                className="flex items-center space-x-2"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{currentCompany?.name}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>

              {showCompanySelector && (
                <div className="absolute right-0 mt-2 w-64 bg-popover border rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Changer d'entreprise</p>
                    {companies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleCompanySwitch(company.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          company.id === currentCompany?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{company.name}</span>
                          {company.id === currentCompany?.id && (
                            <span className="text-xs">Actuel</span>
                          )}
                        </div>
                        <p className="text-xs opacity-70 capitalize">{company.plan}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs flex items-center justify-center text-white">
              3
            </span>
          </Button>

          {/* Toggle thème */}
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Menu utilisateur */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2"
            >
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.role?.name}
                </p>
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-popover border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.role?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      router.push('/dashboard/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Mon profil</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/dashboard/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </button>

                  <hr className="my-2" />

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fermer les menus en cliquant à l'extérieur */}
      {(showUserMenu || showCompanySelector) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
            setShowCompanySelector(false);
          }}
        />
      )}
    </header>
  );
}

