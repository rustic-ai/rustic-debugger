import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bug, 
  Download, 
  Settings,
  Database
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/debug', label: 'Debug Messages', icon: Bug },
  { to: '/export', label: 'Export Data', icon: Download },
  { to: '/cache', label: 'Cache Management', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center space-x-3 px-3 py-2 rounded-lg
              transition-colors duration-150
              ${isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-foreground'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}