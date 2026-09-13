import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Restricts access to full admins — a sous_admin is bounced to their tracking page. */
  requireFullAdmin?: boolean;
}

export function ProtectedRoute({ children, requireFullAdmin = false }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner label="Vérification de l'authentification…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireFullAdmin && role !== 'admin') {
    return <Navigate to="/admin/suivi" replace />;
  }

  return <>{children}</>;
}
