import { useState, useEffect } from 'react';
import { Database, Activity, LogIn, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import './index.css';

function App() {
  const [dbStatus, setDbStatus] = useState<{ status: string; uptime?: string; checkedAt?: string }>({ status: 'Connecting...' });
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiUrl) throw new Error('VITE_API_BASE_URL is not set in environment variables');
        const response = await fetch(`${apiUrl}/health`);
        if (!response.ok) throw new Error('API Unavailable');
        const data = await response.json();
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setDbStatus({ status: 'Connected', uptime: data.db_uptime, checkedAt: timeStr });
      } catch (err: any) {
        setError(err.message);
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setDbStatus({ status: 'Disconnected', checkedAt: timeStr });
      }
    };

    fetchStatus();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="card">
        <div className="card-header">
          <div className="logo-wrapper">
            <Activity />
          </div>
          <h1>PayMeBack Webapp</h1>
          <p className="subtitle">High-performance framework foundation</p>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-value">
              <div className={`status-dot ${error ? 'error' : ''}`}></div>
              {dbStatus.status}
            </div>
            <div className="stat-label">Database Status</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                <Database size={20} className="text-primary" />
                <span>Uptime: {dbStatus.uptime || '--:--:--'}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px', marginLeft: '28px' }}>
                At: {dbStatus.checkedAt || '--:--:--'}
              </div>
            </div>
            <div className="stat-label" style={{ marginTop: '10px' }}>System Uptime</div>
          </div>
        </div>

        {user ? (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: '#111827' }}>
              Welcome, {user.display_name || user.email}!
            </h3>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/me')} style={{ flex: 1 }}>
                <UserCircle size={20} />
                Profile
              </button>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ flex: 1, backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              <LogIn size={20} />
              Login / Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
