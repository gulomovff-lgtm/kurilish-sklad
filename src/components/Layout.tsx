import { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, LogOut,
  Menu, X, ChevronLeft, ChevronRight, Shield, Bot, HardHat,
  BarChart3, ShoppingCart, Settings, BookOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { ROLE_LABELS, needsMyAction } from '../utils';
import type { Translations } from '../i18n';
import toast from 'react-hot-toast';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { SkladRequest } from '../types';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

function buildNavGroups(t: Translations): NavGroup[] {
  return [
    {
      label: t.nav_group_workspace,
      items: [
        { to: '/',                label: t.nav_dashboard,  icon: LayoutDashboard, roles: ['prоrab','sklad','nachalnik','finansist','snab','admin'] },
        { to: '/requests',        label: t.nav_requests,   icon: FileText,        roles: ['prоrab','sklad','nachalnik','finansist','snab','admin'], badge: true },
        { to: '/warehouse',       label: t.nav_warehouse,  icon: Package,         roles: ['sklad','admin','nachalnik','snab'] },
        { to: '/purchase-orders', label: t.nav_purchases,  icon: ShoppingCart,    roles: ['snab','admin','nachalnik'] },
        { to: '/analytics',       label: t.nav_analytics,  icon: BarChart3,       roles: ['nachalnik','finansist','snab','admin'] },
      ],
    },
    {
      label: t.nav_group_refs,
      items: [
        { to: '/objects', label: t.nav_objects, icon: HardHat, roles: ['admin','nachalnik','prоrab'] },
        { to: '/help',    label: t.nav_help,    icon: BookOpen, roles: ['prоrab','sklad','nachalnik','finansist','snab','admin'] },
      ],
    },
    {
      label: t.nav_group_admin,
      items: [
        { to: '/users',    label: t.nav_users,    icon: Users, roles: ['admin'] },
        { to: '/telegram', label: t.nav_telegram, icon: Bot,   roles: ['admin'] },
      ],
    },
  ];
}

export default function Layout({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const { lang, t, toggleLang }  = useLang();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [actionCount,  setActionCount]  = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  const navGroups = useMemo(() => buildNavGroups(t), [t]);

  // ── Счётчик заявок, требующих действия ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      const cnt = snap.docs.filter(d => {
        const r = d.data() as SkladRequest;
        return needsMyAction(r.status, currentUser.role, r.chain ?? 'full');
      }).length;
      setActionCount(cnt);
    });
  }, [currentUser]);

  // ── Закрыть профиль при клике вне ─────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => {
    setShowProfile(false);
    await logout();
    toast.success(lang === 'ru' ? 'Вы вышли из системы' : 'Tizimdan chiqdingiz');
    navigate('/login');
  };

  // ── Sidebar contents ───────────────────────────────────────────────────────
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const isIcon = collapsed && !mobile;
    return (
      <div className="flex flex-col h-full">

        {/* ── Logo + collapse ── */}
        <div
          className="flex items-center h-14 px-3 shrink-0"
          style={{ borderBottom: '1px solid #5c2e1a' }}
        >
          <div className={`flex items-center gap-2.5 flex-1 min-w-0 ${isIcon ? 'justify-center' : ''}`}>
            <img
              src="https://nirvanaresidence.uz/assets/img/logo.svg"
              alt="Nirvana"
              className="w-7 h-7 object-contain shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {!isIcon && (
              <div className="min-w-0">
                <h1 className="font-display text-white font-semibold text-sm leading-none tracking-wide truncate">Nirvana</h1>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: '#a07060' }}>Склад и заявки</p>
              </div>
            )}
          </div>
          {!mobile && (
            <button
              onClick={() => setCollapsed(v => !v)}
              className="shrink-0 p-1 rounded-md transition-colors text-[#7a4030] hover:text-white hover:bg-[#3d1c0e]"
              title={isIcon ? 'Развернуть' : 'Свернуть'}
            >
              {isIcon
                ? <ChevronRight className="w-4 h-4" />
                : <ChevronLeft  className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* ── Navigation groups ── */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0">
          {navGroups.map(group => {
            const items = group.items.filter(it => currentUser && it.roles.includes(currentUser.role));
            if (!items.length) return null;
            return (
              <div key={group.label} className="mb-1">
                {!isIcon && (
                  <p className="px-2 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest select-none"
                    style={{ color: '#6b3020' }}>
                    {group.label}
                  </p>
                )}
                {isIcon && <div className="my-1.5 mx-1.5 h-px" style={{ background: '#3d1c0e' }} />}
                {items.map(({ to, label, icon: Icon, badge }) => {
                  const active  = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
                  const cnt     = badge ? actionCount : 0;
                  return (
                    <Link
                      key={to}
                      to={to}
                      title={isIcon ? label : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className="relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-all"
                      style={{
                        background:     active ? '#c89587' : 'transparent',
                        color:          active ? '#fff' : '#e8cfc5',
                        justifyContent: isIcon ? 'center' : 'flex-start',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#3d1c0e'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isIcon && <span className="flex-1 truncate">{label}</span>}
                      {cnt > 0 && (
                        <span className={`shrink-0 flex items-center justify-center font-bold rounded-full
                          ${active ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}
                          ${isIcon
                            ? 'absolute top-0.5 right-0.5 min-w-[14px] h-3.5 text-[8px] px-0.5'
                            : 'min-w-[18px] h-[18px] text-[10px]'}`}>
                          {cnt > 99 ? '99+' : cnt}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── Language switcher ── */}
        <div className="shrink-0 px-2 pb-1">
          <button
            onClick={toggleLang}
            title={lang === 'ru' ? "O'zbekcha" : 'Русский'}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 w-full transition-all ${
              isIcon ? 'justify-center' : ''
            }`}
            style={{ background: '#3d1c0e', color: '#e8cfc5' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#5c2e1a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#3d1c0e'; }}
          >
            <span
              className="inline-flex items-center justify-center rounded font-extrabold shrink-0"
              style={{
                width: '1.75rem', height: '1.25rem', fontSize: '0.6rem', letterSpacing: '0.05em',
                background: lang === 'ru' ? '#1b6b3a' : '#c9a227', color: '#fff',
              }}
            >
              {lang === 'ru' ? 'UZ' : 'RU'}
            </span>
            {!isIcon && (
              <span className="text-[11px] font-semibold leading-none">
                {lang === 'ru' ? "O'zbekcha" : 'Русский'}
              </span>
            )}
          </button>
        </div>

        {/* ── Profile card ── */}
        <div
          ref={profileRef}
          className="relative shrink-0 px-1.5 pt-2 pb-2"
          style={{ borderTop: '1px solid #5c2e1a' }}
        >
          {/* Popup */}
          {showProfile && (
            <div
              className="absolute bottom-full left-1.5 right-1.5 mb-1.5 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: '#1c0b05', border: '1px solid #5c2e1a' }}
            >
              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #3d1c0e' }}>
                <p className="text-white text-xs font-semibold truncate">{currentUser?.displayName}</p>
                <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: '#a07060' }}>
                  {currentUser?.role === 'admin' && <Shield className="w-3 h-3" />}
                  {currentUser ? ROLE_LABELS[currentUser.role] : ''}
                </p>
              </div>
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left opacity-30 cursor-not-allowed"
                style={{ color: '#e8cfc5' }}
              >
                <Settings className="w-3.5 h-3.5" /> {t.profile_settings}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                style={{ color: '#f87171' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#7a1e1e'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <LogOut className="w-3.5 h-3.5" /> {t.logout}
              </button>
            </div>
          )}

          {/* Card button */}
          <button
            onClick={() => setShowProfile(v => !v)}
            className={`w-full rounded-xl px-2 py-2 flex items-center gap-2.5 transition-all ${isIcon ? 'justify-center' : ''}`}
            style={{ background: showProfile ? '#3d1c0e' : 'transparent' }}
            onMouseEnter={e => { if (!showProfile) (e.currentTarget as HTMLElement).style.background = '#3d1c0e'; }}
            onMouseLeave={e => { if (!showProfile) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title={isIcon ? `${currentUser?.displayName} · ${currentUser ? ROLE_LABELS[currentUser.role] : ''}` : undefined}
          >
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ background: currentUser?.role === 'admin' ? '#7a1e1e' : '#5c2e1a' }}
            >
              {currentUser?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            {!isIcon && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white text-xs font-medium truncate leading-tight">{currentUser?.displayName}</p>
                  <p className="text-[10px] truncate" style={{ color: '#a07060' }}>
                    {currentUser ? ROLE_LABELS[currentUser.role] : ''}
                  </p>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${showProfile ? '-rotate-90' : 'rotate-90'}`}
                  style={{ color: '#7a4030' }}
                />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col shrink-0 transition-all duration-200 overflow-hidden"
        style={{ background: '#2a1208', width: collapsed ? '56px' : '220px' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 flex flex-col" style={{ background: '#2a1208' }}>
            <button
              className="absolute top-3 right-3 z-10 text-white/50 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b shrink-0"
          style={{ borderColor: '#edd5c8' }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: '#a67161' }}>
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="https://nirvanaresidence.uz/assets/img/logo.svg"
            alt="Nirvana"
            className="w-6 h-6 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="font-display font-semibold text-base" style={{ color: '#59301f' }}>Nirvana</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
