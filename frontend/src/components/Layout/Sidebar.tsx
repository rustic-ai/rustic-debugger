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

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  return (
    <nav className="p-4 space-y-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `
            flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg
            transition-colors duration-150 group relative
            ${isActive
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-foreground'
            }
          `}
          title={isCollapsed ? item.label : undefined}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>{item.label}</span>}

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md invisible group-hover:visible whitespace-nowrap z-50">
              {item.label}
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}