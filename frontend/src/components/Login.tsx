import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';

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
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/v1/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send magic link');
      }

      localStorage.setItem('lastEmail', email);
      setMessage({ text: data.msg || 'Magic link sent! Check your email.', type: 'success' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send magic link';
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
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-float border-2 border-primary/20">
                <span className="material-symbols-outlined text-5xl text-primary">account_balance_wallet</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back!</h1>
              <p className="text-slate-500 text-center mt-2">
                Enter your email to receive a magic link or continue with your password.
              </p>
            </div>

            {/* Email Field */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="login-email">
                Email Address
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-xl mr-3">mail</span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium"
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
              className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 mb-4 disabled:opacity-60 disabled:hover:scale-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
              {isSending && !showPassword ? 'Sending...' : 'Send Magic Link'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-sm text-slate-400 font-medium">or use password</span>
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
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-xl mr-3">lock</span>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                    placeholder="Enter your password"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">login</span>
                  {isSending ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Create Account Link */}
            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-primary font-bold hover:underline cursor-pointer"
                onClick={() => {
                  /* For now, send magic link which auto-creates */
                  setMessage({ text: 'Enter your email above and click "Send Magic Link" — a new account will be created automatically.', type: 'success' });
                }}
              >
                Create one
              </button>
            </p>

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

      {/* Bottom Hero Banner */}
      <div className="bg-primary/5 border-t border-primary/10 py-12 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">payments</span>
          </div>
          <p className="text-slate-600 font-medium text-lg">
            Track expenses and get paid back instantly.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
