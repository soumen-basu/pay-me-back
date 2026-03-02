import { useState, useEffect } from 'react';
import { Database, Activity, LogIn, Mail } from 'lucide-react';
import './index.css';

function App() {
  const [dbStatus, setDbStatus] = useState<{ status: string; uptime?: string }>({ status: 'Connecting...' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiUrl) throw new Error('VITE_API_BASE_URL is not set in environment variables');
        const response = await fetch(`${apiUrl}/health`);
        if (!response.ok) throw new Error('API Unavailable');
        const data = await response.json();
        setDbStatus({ status: 'Connected', uptime: data.db_uptime });
      } catch (err: any) {
        setError(err.message);
        setDbStatus({ status: 'Disconnected' });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="auth-container">
      <div className="card">
        <div className="card-header">
          <div className="logo-wrapper">
            <Activity />
          </div>
          <h1>Stenella Webapp</h1>
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
            <div className="stat-value">
              <Database size={20} className="text-primary" />
              {dbStatus.uptime || '--:--:--'}
            </div>
            <div className="stat-label">System Uptime</div>
          </div>
        </div>

        <button className="btn btn-primary">
          <LogIn size={20} />
          Login with Password
        </button>
        <button className="btn btn-secondary">
          <Mail size={20} />
          Send Magic Link
        </button>
      </div>
    </div>
  );
}

export default App;
