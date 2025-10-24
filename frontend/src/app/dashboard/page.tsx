// ========================================
// PAGE PRINCIPALE DU DASHBOARD
// ========================================

'use client';

import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Building2, 
  Shield, 
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { user, currentCompany } = useAuthStore();

  // Données simulées pour les statistiques
  const stats = [
    {
      title: 'Utilisateurs actifs',
      value: '1,234',
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Entreprises',
      value: '56',
      change: '+3%',
      trend: 'up',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Connexions aujourd\'hui',
      value: '892',
      change: '+8%',
      trend: 'up',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Taux de conversion',
      value: '68%',
      change: '-2%',
      trend: 'down',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'user_login',
      message: 'Marie Dubois s\'est connectée',
      time: 'Il y a 5 minutes',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: 2,
      type: 'user_created',
      message: 'Nouvel utilisateur créé: Jean Martin',
      time: 'Il y a 15 minutes',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      id: 3,
      type: 'security_alert',
      message: 'Tentative de connexion suspecte détectée',
      time: 'Il y a 1 heure',
      icon: AlertCircle,
      color: 'text-red-600',
    },
    {
      id: 4,
      type: 'system_update',
      message: 'Mise à jour système effectuée',
      time: 'Il y a 2 heures',
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ];

  const quickActions = [
    {
      title: 'Créer un utilisateur',
      description: 'Ajouter un nouvel utilisateur à votre entreprise',
      href: '/dashboard/users/create',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Gérer les rôles',
      description: 'Configurer les permissions et rôles',
      href: '/dashboard/roles',
      icon: Shield,
      color: 'bg-green-500',
    },
    {
      title: 'Paramètres',
      description: 'Configurer votre entreprise',
      href: '/dashboard/settings',
      icon: Building2,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête de bienvenue */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {user?.firstName} ! 👋
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de votre activité pour {currentCompany?.name}
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change} par rapport au mois dernier
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>
              Accédez rapidement aux fonctionnalités principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => window.location.href = action.href}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Les dernières actions sur votre plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-1 rounded-full ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {activity.message}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle>État du système</CardTitle>
          <CardDescription>
            Informations sur votre environnement et configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Entreprise actuelle</h4>
              <p className="text-sm text-muted-foreground">
                {currentCompany?.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                Plan: {currentCompany?.plan}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Votre rôle</h4>
              <p className="text-sm text-muted-foreground">
                {user?.role?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.role?.permissions?.length || 0} permissions
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Dernière connexion</h4>
              <p className="text-sm text-muted-foreground">
                {user?.lastLoginAt 
                  ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Première connexion'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                2FA: {user?.isTwoFactorEnabled ? 'Activé' : 'Désactivé'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

