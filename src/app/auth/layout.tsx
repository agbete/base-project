// ========================================
// LAYOUT POUR LES PAGES D'AUTHENTIFICATION
// ========================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentification - SaaS App',
  description: 'Connectez-vous à votre compte SaaS App',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {children}
    </div>
  );
}

