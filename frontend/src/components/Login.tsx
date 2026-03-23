import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (!email) {
      setMessage({ text: 'Please enter an email address', type: 'error' });
      return;
    }
    setIsSending(true);
    setMessage(null);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/v1/auth/access-token`, {
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setMessage({ text: errorMsg, type: 'error' });
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
      const data = await api.post<{ msg: string }>('/api/v1/auth/magic-link', { email });
      localStorage.setItem('lastEmail', email);
      setMessage({ text: data.msg || 'Magic link sent! Check your email.', type: 'success' });
    } catch (err: unknown) {
      const errorMsg = (err as any).detail || 'Failed to send magic link';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const topNavActions = (
    <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 text-slate-500 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer">
      <span className="material-symbols-outlined text-xl">help</span>
    </button>
  );

  return (
    <PageLayout variant="auth" topNavActions={topNavActions}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-[480px] w-full animate-slide-up">
          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-primary/5 flex flex-col items-center">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8 w-full">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-float border-4 border-primary/20 shadow-lg">
                <span className="material-symbols-outlined text-5xl text-primary">account_balance_wallet</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-center" style={{ fontFamily: "'Quicksand', sans-serif" }}>Welcome back!</h1>
              <p className="text-slate-500 text-center mt-2">
                Enter your email to receive a magic link or continue with your password.
              </p>
            </div>

            <div className="max-w-[320px] w-full flex flex-col gap-6">
              {/* Email Field */}
              <div className="w-full">
                <label className="block text-sm font-bold text-slate-700 mb-2 text-center" htmlFor="login-email">
                  Email Address
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all w-full relative">
                  <span className="material-symbols-outlined text-slate-400 text-xl absolute left-4">mail</span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium w-full text-center"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              {/* Send Magic Link Button */}
              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={isSending}
                className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                {isSending && !showPassword ? 'Sending...' : 'Send Magic Link'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-sm text-slate-400 font-medium whitespace-nowrap text-center">or use password</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Enter Password Button / Password Form */}
              {!showPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(true)}
                  className="w-full bg-white text-slate-700 font-bold py-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">lock</span>
                  Enter Password
                </button>
              ) : (
                <form onSubmit={handlePasswordLogin} className="flex flex-col gap-6 w-full">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all w-full relative">
                    <span className="material-symbols-outlined text-slate-400 text-xl absolute left-4">lock</span>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium w-full text-center"
                      placeholder="Enter your password"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-xl">login</span>
                    {isSending ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              )}

              {/* Create Account Link */}
              <p className="text-center text-sm text-slate-500 w-full mb-2">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="text-primary font-bold hover:underline cursor-pointer"
                  onClick={() => {
                    setMessage({ text: 'Enter your email above and click "Send Magic Link" — a new account will be created automatically.', type: 'success' });
                  }}
                >
                  Create one
                </button>
              </p>
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`mt-6 px-4 py-3 rounded-xl text-sm font-medium text-center ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-green-50 text-green-700 border border-green-100'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>


    </PageLayout>
  );
}
