import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type UserProfile = {
    id: number;
    email: string;
    display_name: string | null;
    role: string;
    is_active: true;
    has_password?: boolean;
};

interface AuthContextType {
    token: string | null;
    user: UserProfile | null;
    login: (token: string) => void;
    logout: () => void;
    loading: boolean;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchUser = async (authToken: string) => {
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiUrl}/api/v1/users/me`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                // Token is likely invalid, clear it
                setToken(null);
                setUser(null);
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Failed to fetch user', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchUser(token);
        } else {
            setLoading(false);
            setUser(null);
        }
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshToken = async () => {
        if (token) {
            await fetchUser(token);
        }
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, loading, refreshToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
