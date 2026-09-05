import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Camera, AlertTriangle, ScanFace, Users, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cameras', label: 'Cámaras', icon: Camera },
  { to: '/events', label: 'Eventos', icon: AlertTriangle },
  { to: '/face-id', label: 'Face ID', icon: ScanFace },
  { to: '/users', label: 'Usuarios', icon: Users },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-60 bg-card border-r border-slate-700/50 flex flex-col min-h-screen">
      <div className="p-5 flex items-center gap-2 border-b border-slate-700/50">
        <Shield className="w-6 h-6 text-accent" />
        <span className="font-bold text-lg">DAWA<span className="text-accent">Security</span></span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-accent text-white' : 'text-slate-300 hover:bg-slate-700/40'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700/50">
        <div className="px-4 py-2 text-xs text-slate-400">
          <div className="font-medium text-slate-200">{user?.fullName || user?.email}</div>
          <div className="text-accent/80">{user?.role}</div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}