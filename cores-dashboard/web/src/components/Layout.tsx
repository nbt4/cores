// File: cores-dashboard/web/src/components/Layout.tsx
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, LogOut, User, ExternalLink, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const close = () => { if (isMobile) setSidebarOpen(false); };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const getRentalURL = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '8080') return `${protocol}//${hostname}:8081`;
    return `${protocol}//${hostname.replace(/^cores\./, 'rent.')}`;
  };
  const getWarehouseURL = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '8080') return `${protocol}//${hostname}:8082`;
    return `${protocol}//${hostname.replace(/^cores\./, 'warehouse.')}`;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard', exact: true },
    { path: '/admin', icon: Settings, label: 'Administration' },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-200
        ${sidebarOpen ? 'w-56' : 'w-14'}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
        style={{ background: '#111111', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5">
          <div className="w-8 h-8 bg-accent-red rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 14px rgba(208,2,27,0.3)' }}>
            <span className="text-white font-black text-sm">C</span>
          </div>
          {sidebarOpen && <span className="text-white font-black tracking-widest text-sm">CORES</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
          {navItems.map(({ path, icon: Icon, label, exact }) => (
            <Link key={path} to={path} onClick={close}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive(path, exact) ? 'bg-accent-red text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </Link>
          ))}

          {/* Cross-navigation */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-1">
            <a href={getRentalURL()} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>RentalCore</span>}
            </a>
            <a href={getWarehouseURL()} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>WarehouseCore</span>}
            </a>
          </div>
        </nav>

        {/* User + Logout */}
        <div className="p-2 border-t border-white/5">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            {sidebarOpen && <span className="text-gray-300 text-sm truncate flex-1">{user?.username}</span>}
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      {/* Toggle button (mobile) */}
      {isMobile && (
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-3 left-3 z-40 w-9 h-9 bg-dark-200 rounded-lg flex items-center justify-center text-gray-300">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Main content */}
      <main className={`flex-1 transition-all duration-200 ${sidebarOpen && !isMobile ? 'ml-56' : 'ml-14'} ${isMobile ? 'ml-0' : ''}`}>
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
