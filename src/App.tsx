import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/modulos/auth/AuthContext';
import { LoginPage } from '@/modulos/auth/LoginPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/modulos/dashboard/DashboardPage';
import { ProyectosListPage } from '@/modulos/proyectos/ProyectosListPage';
import { ProyectoDetallePage } from '@/modulos/proyectos/ProyectoDetallePage';
import { FinanzasPage } from '@/modulos/finanzas/FinanzasPage';
import { OnboardingPage } from '@/modulos/onboarding/OnboardingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/proyectos" element={<ProyectosListPage />} />
              <Route path="/proyectos/:id" element={<ProyectoDetallePage />} />
              <Route path="/finanzas" element={<FinanzasPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
