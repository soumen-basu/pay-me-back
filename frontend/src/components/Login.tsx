import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, LogIn, Mail } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isSending, setIsSending] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    useEffect(() => {
        const savedEmail = localStorage.getItem('lastEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setMessage(null);
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiUrl}/api/v1/login/access-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to login');
            }

            localStorage.setItem('lastEmail', email);
            login(data.access_token);
            navigate(from, { replace: true });
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMagicLink = async () => {
        if (!email) {
            setMessage({ text: 'Please enter an email address', type: 'error' });
            return;
        }

        setIsSending(true);
        setMessage(null);
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiUrl}/api/v1/auth/magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to send magic link');
            }

            localStorage.setItem('lastEmail', email);
            setMessage({ text: data.msg || 'Magic link sent successfully! Check your email.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-header">
                    <div className="logo-wrapper">
                        <Activity />
                    </div>
                    <h1>Welcome Back</h1>
                    <p className="subtitle">Sign in to your account</p>
                </div>

                <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
                            placeholder="Enter your password"
                        />
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Optional if using magic link</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={isSending}>
                            <LogIn size={20} />
                            {isSending ? 'Please wait...' : 'Login with Password'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                            <span style={{ padding: '0 10px', color: '#6b7280', fontSize: '0.9rem' }}>or</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                        </div>

                        <button type="button" className="btn btn-secondary" onClick={handleSendMagicLink} disabled={isSending}>
                            <Mail size={20} />
                            {isSending ? 'Sending...' : 'Send Magic Link'}
                        </button>
                    </div>
                </form>

                {message && (
                    <div className={`message-box ${message.type === 'error' ? 'error-text' : 'success-text'}`} style={{ marginTop: '1.5rem', padding: '10px', borderRadius: '5px', backgroundColor: message.type === 'error' ? '#ffebee' : '#e8f5e9', color: message.type === 'error' ? '#c62828' : '#2e7d32', textAlign: 'center', fontSize: '0.9rem' }}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}
