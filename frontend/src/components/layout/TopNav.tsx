import { type ReactNode } from 'react';

interface TopNavProps {
  /** Optional right-side actions (e.g. search, buttons) */
  actions?: ReactNode;
  /** Show a subtitle under the app name */
  subtitle?: string;
}

export function TopNav({ actions, subtitle }: TopNavProps) {
  return (
    <header className="w-full border-b border-primary/10 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex justify-center">
      <div className="max-w-[320px] w-full flex items-center justify-between whitespace-nowrap">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h2 className="text-slate-900 text-xl font-extrabold tracking-tight">Pay Me Back!</h2>
            {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-4 items-center">
          {actions}
        </div>
      </div>
    </header>
  );
}
