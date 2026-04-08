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
      setIsMobile(window.innerWidth < 768); // md breakpoint
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity"
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
        {/* Mobile Header: Visible when isMobile is true (window < 768px) */}
        {isMobile && (
          <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-primary/10 flex-shrink-0 z-20">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 -ml-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => window.location.href = '/dashboard'}
              >
                <div className="size-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                </div>
                <span className="text-slate-900 font-extrabold tracking-tight text-sm">PMB!</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {topNavActions}
            </div>
          </header>
        )}

        {/* Desktop Header: Visible when not mobile AND (actions or subtitle exist) */}
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

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
