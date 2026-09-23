import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Settings, Package, MessageSquare, Image, 
  LogOut, ExternalLink, Menu, X, ShieldCheck, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/superadmin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/superadmin', icon: LayoutDashboard, end: true },
    { label: 'Site Settings', path: '/superadmin/settings', icon: Settings },
    { label: 'Products Manager', path: '/superadmin/products', icon: Package },
    { label: 'Enquiries Inbox', path: '/superadmin/enquiries', icon: Mail },
    { label: 'Media Library', path: '/superadmin/media', icon: Image },
    { label: 'Testimonials', path: '/superadmin/testimonials', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ariso-500 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="font-bold text-lg">ARISO Admin</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/superadmin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-ariso-600 flex items-center justify-center text-white shadow-md">
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
                  <path d="M8 22L16 8L24 22H19.5L16 15.5L12.5 22H8Z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <span className="font-extrabold text-lg text-white block leading-none">ARISO</span>
                <span className="text-[10px] text-ariso-400 font-semibold tracking-wider uppercase">Superadmin</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ariso-600 text-white font-semibold shadow-md shadow-ariso-600/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            <span>View Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-400">
            <div className="truncate max-w-[140px]">
              <span className="block text-white font-medium truncate">{user?.email || 'admin@ariso.in'}</span>
              <span className="text-[10px] text-emerald-400">Online</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen p-4 sm:p-8 lg:p-10 max-w-7xl overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
