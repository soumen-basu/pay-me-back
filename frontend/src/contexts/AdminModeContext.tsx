import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminModeContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (mode: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isAdminMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isAdminMode', String(isAdminMode));
    if (isAdminMode) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }
  }, [isAdminMode]);

  const toggleAdminMode = () => setIsAdminMode(prev => !prev);
  const setAdminMode = (mode: boolean) => setIsAdminMode(mode);

  return (
    <AdminModeContext.Provider value={{ isAdminMode, toggleAdminMode, setAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
}
