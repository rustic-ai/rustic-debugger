import { ReactNode, useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { wsClient } from '@/services/websocket/client';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Initialize WebSocket connection
  useEffect(() => {
    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Mobile menu button */}
        {!isDesktop && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        
        {/* Sidebar - desktop always visible, mobile toggle */}
        <aside className={`
          ${isDesktop ? 'relative' : 'fixed inset-y-0 left-0 z-40'}
          ${!isDesktop && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed && isDesktop ? 'w-16' : 'w-64'} bg-card border-r h-full
        `}>
          {/* Desktop sidebar toggle button */}
          {isDesktop && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-3 top-6 z-10 p-1.5 bg-card border border-border rounded-full shadow-md hover:bg-muted transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          <Sidebar isCollapsed={sidebarCollapsed && isDesktop} />
        </aside>
        
        {/* Mobile overlay */}
        {!isDesktop && mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}