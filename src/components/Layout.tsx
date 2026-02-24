import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, LogOut,
  Menu, X, ChevronRight, Shield, Bot, HardHat
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../utils';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard, roles: ['prоrab','sklad','nachalnik','finansist','snab','admin'] },
  { to: '/requests', label: 'Заявки', icon: FileText, roles: ['prоrab','sklad','nachalnik','finansist','snab','admin'] },
  { to: '/warehouse', label: 'Склад', icon: Package, roles: ['sklad','admin','nachalnik','snab'] },
  { to: '/objects', label: 'Объекты', icon: HardHat, roles: ['admin','nachalnik','prоrab'] },
  { to: '/users', label: 'Пользователи', icon: Users, roles: ['admin'] },
  { to: '/telegram', label: 'Telegram', icon: Bot, roles: ['admin'] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Вы вышли из системы');
    navigate('/login');
  };

  const allowedNav = navItems.filter(n => currentUser && n.roles.includes(currentUser.role));

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid #5c2e1a' }}>
        <img
          src="https://nirvanaresidence.uz/assets/img/logo.svg"
          alt="Nirvana"
          className="w-9 h-9 object-contain shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <h1 className="font-display text-white font-semibold text-base leading-none tracking-wide">Nirvana Luxury</h1>
          <p className="text-xs mt-0.5" style={{ color: '#a07060' }}>Residence &bull; Склад и заявки</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #5c2e1a' }}>
        <p className="text-white font-medium text-sm truncate">{currentUser?.displayName}</p>
        <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2.5 py-1 rounded-full"
          style={{
            background: currentUser?.role === 'admin' ? '#7a1e1e' : '#4f2415',
            color: '#e8cfc5',
          }}>
          {currentUser?.role === 'admin' && <Shield className="w-3 h-3" />}
          {currentUser ? ROLE_LABELS[currentUser.role] : ''}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {allowedNav.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? '#c89587' : 'transparent',
                color: active ? '#fff' : '#e8cfc5',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#3d1c0e'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #5c2e1a' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: '#a07060' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = '#7a1e1e'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#a07060'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0" style={{ background: '#2a1208' }}>
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-72 flex flex-col" style={{ background: '#2a1208' }}>
            <button
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b" style={{ borderColor: '#edd5c8' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: '#a67161' }}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg" style={{ color: '#59301f' }}>Nirvana Luxury Residence</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
