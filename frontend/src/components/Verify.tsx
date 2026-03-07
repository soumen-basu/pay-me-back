import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Activity } from 'lucide-react';

export function Verify() {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your magic link...');
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const verifyLink = async () => {
            const params = new URLSearchParams(location.search);
            const email = params.get('email');
            const token = params.get('token');

            if (!email || !token) {
                setStatus('error');
                setMessage('Invalid magic link. Missing email or token.');
                return;
            }

            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL;
                const response = await fetch(`${apiUrl}/api/v1/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('Successfully verified!');
                    login(data.access_token);

                    // Redirect to user's profile after a short delay
                    setTimeout(() => {
                        navigate('/me', { replace: true });
                    }, 1500);
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Verification failed. The link may have expired.');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage('A network error occurred during verification.');
            }
        };

        verifyLink();
    }, [location.search, navigate, login]);

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div className="card-header">
                    <div className="logo-wrapper">
                        <Activity />
                    </div>
                    <h1>Magic Link Verification</h1>
                </div>

                <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                    {status === 'verifying' && (
                        <div style={{ color: '#6b7280' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            {message}
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={{ color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
                            <svg style={{ width: '40px', height: '40px', margin: '0 auto 0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <br />
                            {message}<br />
                            <span style={{ fontSize: '0.9rem', marginTop: '0.5rem', display: 'block' }}>Redirecting...</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ color: '#c62828', backgroundColor: '#ffebee', padding: '1rem', borderRadius: '8px' }}>
                            <svg style={{ width: '40px', height: '40px', margin: '0 auto 0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            <br />
                            {message}
                            <div style={{ marginTop: '1.5rem' }}>
                                <button className="btn btn-primary" onClick={() => navigate('/login')}>Return to Login</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
