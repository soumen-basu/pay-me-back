import { useNavigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import { useEffect } from 'react';

function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show a brief loading state while auth resolves
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
        <span className="text-lg font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default App;
