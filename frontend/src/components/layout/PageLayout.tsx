import { type ReactNode } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

type LayoutVariant = 'auth' | 'app';

interface PageLayoutProps {
  /** 'auth' = centered card, no sidebar. 'app' = sidebar + content area */
  variant: LayoutVariant;
  children: ReactNode;
  /** TopNav right-side actions */
  topNavActions?: ReactNode;
  /** TopNav subtitle */
  topNavSubtitle?: string;
}

export function PageLayout({ variant, children, topNavActions, topNavSubtitle }: PageLayoutProps) {
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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
