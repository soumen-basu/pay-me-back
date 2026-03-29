import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

interface AdminModeContextType {
  isAdminMode: boolean;
  toggleAdminMode: (navigate: (path: string) => void) => void;
  setAdminMode: (mode: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isAdminMode');
    return saved === 'true';
  });

  const [lastUserPath, setLastUserPath] = useState<string>(() => {
    return localStorage.getItem('lastUserPath') || '/dashboard';
  });

  const [lastAdminPath, setLastAdminPath] = useState<string>(() => {
    return localStorage.getItem('lastAdminPath') || '/admin/dashboard';
  });

  // Sync admin mode with user role
  useEffect(() => {
    if (user && user.role !== 'admin' && isAdminMode) {
      console.log('User is not an admin, disabling admin mode');
      setIsAdminMode(false);
    }
  }, [user, isAdminMode]);

  useEffect(() => {
    localStorage.setItem('isAdminMode', String(isAdminMode));
    if (isAdminMode) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }
  }, [isAdminMode]);

  // Update last paths when location changes
  useEffect(() => {
    const path = location.pathname;
    
    // Skip tracking for auth and root redirect
    if (path === '/' || path.startsWith('/login') || path.startsWith('/verify')) {
      return;
    }

    if (path.startsWith('/admin')) {
      setLastAdminPath(path);
      localStorage.setItem('lastAdminPath', path);
    } else {
      // It's a standard user path
      setLastUserPath(path);
      localStorage.setItem('lastUserPath', path);
    }
  }, [location]);

  const toggleAdminMode = (navigate: (path: string) => void) => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    
    // Perform navigation on toggle
    if (newMode) {
      navigate(lastAdminPath);
    } else {
      navigate(lastUserPath);
    }
  };

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
