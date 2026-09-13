import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Vote,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LogoPlaceholder } from './LogoPlaceholder';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/admin/candidates', label: 'Candidats', icon: Users },
  { to: '/admin/codes', label: 'Codes de vote', icon: KeyRound },
  { to: '/admin/election', label: 'Élection', icon: Vote },
  { to: '/admin/results', label: 'Résultats', icon: BarChart3 },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const navLinks = (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 text-white">
          <LogoPlaceholder size={28} />
          <span className="font-bold">L2 MIAGE</span>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-white hover:bg-slate-800">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-8 hidden items-center gap-2 px-2 text-white lg:flex">
            <LogoPlaceholder size={32} />
            <div>
              <p className="font-bold leading-tight">L2 MIAGE</p>
              <p className="text-xs text-slate-400">Espace administrateur</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">{navLinks}</nav>

          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-600/20 hover:text-red-400"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="min-h-screen flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
