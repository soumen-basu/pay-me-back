import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { token, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>; // Could be replaced with a better spinner
    }

    if (!token) {
        // Save the intended location to redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
