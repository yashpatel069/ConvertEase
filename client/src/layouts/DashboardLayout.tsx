import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Crop,
  Layers,
  ShieldAlert,
  LogOut,
  Database,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Settings,
  User as UserIcon,
  History,
  Star
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Files', path: '/dashboard/files', icon: FolderOpen },
    { label: 'History', path: '/dashboard/files?filter=all', icon: History },
    { label: 'Favorites', path: '/dashboard/files?filter=favorites', icon: Star },
    { label: 'PDF Tools', path: '/tools/pdf', icon: FileText },
    { label: 'Image Tools', path: '/tools/image', icon: ImageIcon },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
    { label: 'Profile', path: '/dashboard/profile', icon: UserIcon }
  ];

  const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const storageUsed = user?.storageUsed || 0;
  const storageLimit = user?.maxStorageLimit || 104857600; // 100MB
  const storagePercentage = Math.min(100, (storageUsed / storageLimit) * 100);

  const sidebarWidthClass = collapsed ? 'w-20' : 'w-64';

  const NavigationMenu = () => (
    <div className="flex flex-col h-full justify-between py-6">
      <div className="space-y-8 px-4">
        {/* Branding */}
        <div className="flex items-center gap-3 px-2">
          <Link to="/" className="w-9 h-9 rounded-xl bg-orange-accent flex items-center justify-center text-white font-bold text-base shadow-sm">
            CE
          </Link>
          {!collapsed && (
            <span className="font-bold text-base text-white tracking-tight">
              Convert<span className="text-orange-accent">Ease</span>
            </span>
          )}
        </div>

        {/* User Card */}
        {!collapsed && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-accent text-white flex items-center justify-center text-xs font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{user?.name}</h4>
              <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {/* Links */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150
                ${isActive
                  ? 'bg-orange-accent text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
                }
              `}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Admin panel */}
          {user?.role === 'admin' && (
            <NavLink
              to="/dashboard/admin"
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold border border-dashed border-danger/30 transition-all duration-150
                ${isActive
                  ? 'bg-danger text-white'
                  : 'text-danger hover:bg-danger/10'
                }
              `}
              onClick={() => setMobileOpen(false)}
            >
              <ShieldAlert size={16} className="flex-shrink-0" />
              {!collapsed && <span>Admin Center</span>}
            </NavLink>
          )}
        </nav>
      </div>

      <div className="px-4 space-y-6">
        {/* Storage Bar */}
        {!collapsed && (
          <div className="px-2 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-semibold text-white/50">
              <span className="flex items-center gap-1"><Database size={10} /> Storage</span>
              <span>{storagePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  storagePercentage > 90 ? 'bg-danger' : 'bg-orange-accent'
                }`}
                style={{ width: `${storagePercentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-white/40">
              {formatBytes(storageUsed)} of {formatBytes(storageLimit)}
            </p>
          </div>
        )}

        {/* Footer controls */}
        <div className="space-y-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 transition-all"
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-midnight text-white transition-colors duration-200">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block bg-midnight border-r border-white/10 flex-shrink-0 transition-all duration-300 relative ${sidebarWidthClass}`}>
        
        {/* Toggle Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-7 -right-3 w-6 h-6 rounded-full border border-white/10 bg-midnight flex items-center justify-center text-white/85 hover:text-white transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <NavigationMenu />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        {/* Header bar */}
        <header className="fixed top-0 left-0 w-full h-16 border-b border-white/10 bg-midnight z-40 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-accent flex items-center justify-center text-white font-bold text-sm">CE</div>
            <span className="font-bold text-base tracking-tight">ConvertEase</span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-white/70 hover:text-white"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)}>
            <div
              className="absolute left-0 top-0 bottom-0 w-64 bg-midnight border-r border-white/10 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <NavigationMenu />
            </div>
          </div>
        )}
      </div>

      {/* Main Panel Content area */}
      <main className="flex-grow flex flex-col min-h-screen overflow-y-auto px-6 md:px-12 py-10 mt-16 md:mt-0 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

    </div>
  );
};
