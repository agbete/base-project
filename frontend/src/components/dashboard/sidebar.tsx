// ========================================
// SIDEBAR DU DASHBOARD
// ========================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Shield, 
  Building2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Database,
  FileText,
  BarChart3,
  Package,
  CreditCard
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
  badge?: string | number;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    href: '/dashboard/users',
    icon: Users,
    permission: 'users.list',
  },
  {
    id: 'roles',
    label: 'Rôles & Permissions',
    href: '/dashboard/roles',
    icon: Shield,
    permission: 'roles.list',
  },
  {
    id: 'companies',
    label: 'Entreprises',
    href: '/dashboard/companies',
    icon: Building2,
    permission: 'companies.list',
  },
  {
    id: 'crm',
    label: 'CRM',
    href: '/dashboard/crm',
    icon: UserCog,
    permission: 'crm.list',
    children: [
      {
        id: 'crm-clients',
        label: 'Clients',
        href: '/dashboard/crm/clients',
        icon: Users,
        permission: 'crm.clients.list',
      },
      {
        id: 'crm-prospects',
        label: 'Prospects',
        href: '/dashboard/crm/prospects',
        icon: Users,
        permission: 'crm.prospects.list',
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventaire',
    href: '/dashboard/inventory',
    icon: Package,
    permission: 'inventory.list',
    children: [
      {
        id: 'inventory-products',
        label: 'Produits',
        href: '/dashboard/inventory/products',
        icon: Package,
        permission: 'inventory.products.list',
      },
      {
        id: 'inventory-categories',
        label: 'Catégories',
        href: '/dashboard/inventory/categories',
        icon: Database,
        permission: 'inventory.categories.list',
      },
    ],
  },
  {
    id: 'invoicing',
    label: 'Facturation',
    href: '/dashboard/invoicing',
    icon: CreditCard,
    permission: 'invoicing.list',
    children: [
      {
        id: 'invoicing-invoices',
        label: 'Factures',
        href: '/dashboard/invoicing/invoices',
        icon: FileText,
        permission: 'invoicing.invoices.list',
      },
      {
        id: 'invoicing-quotes',
        label: 'Devis',
        href: '/dashboard/invoicing/quotes',
        icon: FileText,
        permission: 'invoicing.quotes.list',
      },
    ],
  },
  {
    id: 'reporting',
    label: 'Rapports',
    href: '/dashboard/reporting',
    icon: BarChart3,
    permission: 'reporting.list',
  },
  {
    id: 'settings',
    label: 'Paramètres',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { hasPermission, currentCompany } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    // Vérifier les permissions
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <div key={item.id}>
        <div
          className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            level > 0 && 'ml-4',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Link
            href={item.href}
            className="flex items-center flex-1 min-w-0"
          >
            <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
            {!isCollapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
          
          {hasChildren && !isCollapsed && (
            <button
              onClick={() => toggleExpanded(item.id)}
              className="p-1 hover:bg-accent/50 rounded"
            >
              <ChevronRight 
                className={cn(
                  'h-3 w-3 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          )}
        </div>

        {/* Sous-éléments */}
        {hasChildren && !isCollapsed && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">SaaS App</h2>
              {currentCompany && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentCompany.name}
                </p>
              )}
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-accent rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">
            <p>Version 1.0.0</p>
            <p>© 2024 SaaS App</p>
          </div>
        )}
      </div>
    </div>
  );
}

