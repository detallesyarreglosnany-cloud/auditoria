import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/modulos/auth/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-texto-secundario text-sm">
        Cargando…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
