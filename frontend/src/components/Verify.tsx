import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';

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

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Verification failed. The link may have expired.');
        }
      } catch {
        setStatus('error');
        setMessage('A network error occurred during verification.');
      }
    };

    verifyLink();
  }, [location.search, navigate, login]);

  const topNavActions = (
    <button
      onClick={() => navigate('/login')}
      className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-slate-500 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-xl">close</span>
    </button>
  );

  return (
    <PageLayout variant="auth" topNavActions={topNavActions}>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
            {/* Icon */}
            <div className="flex flex-col items-center mb-8">
              <div className={`size-24 rounded-full flex items-center justify-center mb-4 border-2 ${
                status === 'verifying' ? 'bg-primary/10 border-primary/20' :
                status === 'success' ? 'bg-green-50 border-green-100' :
                'bg-red-50 border-red-100'
              }`}>
                {status === 'verifying' && (
                  <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                )}
                {status === 'success' && (
                  <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
                )}
                {status === 'error' && (
                  <span className="material-symbols-outlined text-5xl text-red-500">error</span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {status === 'verifying' ? 'Verifying...' :
                 status === 'success' ? 'Authenticated!' : 'Verification Failed'}
              </h1>
              <p className={`mt-2 font-medium ${
                status === 'error' ? 'text-red-500' : 'text-slate-500'
              }`}>
                {message}
              </p>
            </div>

            {status === 'success' && (
              <p className="text-slate-400 text-sm animate-pulse">Redirecting you to dashboard...</p>
            )}

            {status === 'error' && (
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
                Return to Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner fallback */}
      <div className="bg-primary/5 border-t border-primary/10 py-12 px-6 mt-auto">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-slate-600 font-medium">
            Secure, passwordless login with magic links.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

