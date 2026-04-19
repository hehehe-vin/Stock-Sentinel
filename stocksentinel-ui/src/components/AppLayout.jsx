import { Outlet, NavLink } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Eye, AlertTriangle, Upload, Settings,
  LogOut, ChevronLeft, ChevronRight, Activity, Sun, Moon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { datasourceService } from '../services/datasourceService';

export default function AppLayout() {
  const { sidebarExpanded, setSidebarExpanded, currentTheme, setCurrentTheme } = useTheme();
  const { user, logout } = useAuth();
  const [source, setSource] = useState('Loading...');

  useEffect(() => {
    datasourceService.getStatus()
      .then(res => setSource(res.data.activeSource))
      .catch(() => setSource('Unknown'));
      
    const int = setInterval(() => {
      datasourceService.getStatus()
        .then(res => setSource(res.data.activeSource))
        .catch(console.error);
    }, 60000);
    return () => clearInterval(int);
  }, []);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/watchlist', icon: Eye, label: 'Watchlist' },
    { path: '/anomalies', icon: AlertTriangle, label: 'Anomalies' },
    { path: '/csv-upload', icon: Upload, label: 'CSV Upload' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
      
      {/* Sidebar */}
      <aside 
        style={{ 
          background: 'var(--sidebar)', 
          width: sidebarExpanded ? '240px' : '64px',
          borderColor: 'var(--border)'
        }}
        className="transition-all duration-300 flex flex-col border-r"
      >
        
        {/* Logo area */}
        <div className="flex items-center p-4 gap-3">
          <Activity size={24} style={{ color: 'var(--sidebar-accent)' }} className="shrink-0" />
          {sidebarExpanded && (
            <span className="font-bold text-lg whitespace-nowrap overflow-hidden transition-all duration-300"
                  style={{ color: 'var(--sidebar-text)' }}>
              StockSentinel
            </span>
          )}
        </div>

        {/* Toggle button */}
        <div className="flex justify-end px-2 mb-4">
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--sidebar-text)', backgroundColor: 'rgba(128, 128, 128, 0.2)' }}
          >
            {sidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={!sidebarExpanded ? item.label : undefined}
              className={({ isActive }) => 
                `flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 overflow-hidden ${
                  isActive ? 'bg-opacity-20' : 'hover:bg-opacity-10'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? '#ffffff' : 'var(--sidebar-text)',
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
              })}
            >
              <item.icon size={20} className="shrink-0" />
              {sidebarExpanded && (
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Data source badge placeholder */}
          <div className="text-xs mb-3 font-medium truncate flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <div className={`w-2 h-2 rounded-full ${source === 'Loading...' ? 'animate-pulse bg-gray-500' : 'bg-green-500'}`}></div>
            {sidebarExpanded && `Source: ${source}`}
          </div>
          
          {/* User info + actions */}
          <div className="flex items-center gap-2 overflow-hidden justify-between mt-2">
            <button 
              onClick={() => setCurrentTheme(currentTheme && currentTheme.includes('Light') ? 'defaultDark' : 'defaultLight')}
              className="p-2 rounded-lg flex-shrink-0 transition-colors hover:opacity-80" 
              title="Toggle Theme"
              style={{ color: 'var(--sidebar-text)', backgroundColor: 'rgba(128, 128, 128, 0.15)' }}
            >
              {currentTheme && currentTheme.includes('Light') ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div 
              className="flex-1 flex items-center justify-between cursor-pointer rounded-lg p-2 transition-colors hover:opacity-80" 
              onClick={logout} 
              title="Log out" 
              style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)' }}
            >
              {sidebarExpanded && (
                <span className="text-sm font-medium truncate" style={{ color: 'var(--sidebar-text)' }}>
                  {user?.name || "User"}
                </span>
              )}
              <LogOut size={18} style={{ color: 'var(--danger)' }} className="shrink-0" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6" style={{ background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}
