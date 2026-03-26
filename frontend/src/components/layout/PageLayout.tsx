import { type ReactNode, useState, useEffect } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

type LayoutVariant = 'auth' | 'app';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface PageLayoutProps {
  /** 'auth' = centered card, no sidebar. 'app' = sidebar + content area */
  variant: LayoutVariant;
  children: ReactNode;
  /** TopNav right-side actions */
  topNavActions?: ReactNode;
  /** TopNav subtitle */
  topNavSubtitle?: string;
  /** Custom sidebar navigation items */
  sidebarItems?: NavItem[];
}

export function PageLayout({ variant, children, topNavActions, topNavSubtitle, sidebarItems }: PageLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (variant === 'auth') {
    return (
      <div className="flex flex-col min-h-screen">
        <TopNav actions={topNavActions} subtitle={topNavSubtitle} />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  // App layout: sidebar + main content
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Overlay (Mobile only) */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        items={sidebarItems} 
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-16 flex items-center justify-between px-4 bg-white border-b border-primary/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <div className="size-8 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <span className="text-slate-900 font-extrabold tracking-tight">Pay Me Back!</span>
            </div>
            <div className="flex items-center gap-2">
              {topNavActions}
            </div>
          </header>
        )}

        {/* Top Desktop Nav (Optional, for actions/subtitle if needed) */}
        {!isMobile && (topNavActions || topNavSubtitle) && (
          <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-primary/10 flex-shrink-0">
            <div>
               {topNavSubtitle && <p className="text-sm font-medium text-slate-500">{topNavSubtitle}</p>}
            </div>
            <div className="flex items-center gap-4">
              {topNavActions}
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto custom-scrollbar p-0 lg:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
