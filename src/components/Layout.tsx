import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Wallet, Rocket, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const enlaces = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, fin: true },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/onboarding', label: 'Onboarding', icon: Rocket },
];

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-borde bg-panel flex flex-col p-4">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-acento flex items-center justify-center text-fondo font-bold">
            N
          </div>
          <span className="font-semibold text-texto">Nany OS</span>
        </div>

        <nav className="flex-1 space-y-1">
          {enlaces.map(({ to, label, icon: Icon, fin }) => (
            <NavLink
              key={to}
              to={to}
              end={fin}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-acento-suave text-acento font-medium'
                    : 'text-texto-secundario hover:text-texto hover:bg-panel-alto'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-texto-secundario hover:text-peligro hover:bg-peligro-suave transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
