import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { token, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
        );
    }

    if (!token) {
        // Save the intended location to redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based access control for administrative routes
    if (location.pathname.startsWith('/admin') && user?.role !== 'admin') {
        console.warn('Unauthorized access attempt to admin route:', location.pathname);
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
