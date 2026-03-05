import { useState, useEffect } from 'react';
import { Database, Activity, LogIn, Mail } from 'lucide-react';
import './index.css';

function App() {
  const [dbStatus, setDbStatus] = useState<{ status: string; uptime?: string; checkedAt?: string }>({ status: 'Connecting...' });
  const [error, setError] = useState<string | null>(null);
  const [magicLinkMessage, setMagicLinkMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendMagicLink = async () => {
    setIsSending(true);
    setMagicLinkMessage(null);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/v1/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "soumenb@gmail.com" })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send magic link');
      }

      setMagicLinkMessage({ text: data.msg || 'Magic link sent successfully!', type: 'success' });
    } catch (err: any) {
      setMagicLinkMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

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

        <button className="btn btn-primary">
          <LogIn size={20} />
          Login with Password
        </button>
        <button className="btn btn-secondary" onClick={handleSendMagicLink} disabled={isSending}>
          <Mail size={20} />
          {isSending ? 'Sending...' : 'Send Magic Link'}
        </button>

        {magicLinkMessage && (
          <div className={`message-box ${magicLinkMessage.type === 'error' ? 'error-text' : 'success-text'}`} style={{ marginTop: '1rem', padding: '10px', borderRadius: '5px', backgroundColor: magicLinkMessage.type === 'error' ? '#ffebee' : '#e8f5e9', color: magicLinkMessage.type === 'error' ? '#c62828' : '#2e7d32', textAlign: 'center', fontSize: '0.9rem' }}>
            {magicLinkMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
