import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { User, Shield, CheckCircle, Save } from 'lucide-react';

export function Profile() {
    const { user, refreshToken } = useAuth();
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!user) {
        return null;
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password && password !== confirmPassword) {
            setMessage({ text: 'Passwords do not match', type: 'error' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL;
            const token = localStorage.getItem('token');

            const payload: any = {};
            if (displayName !== user.display_name) payload.display_name = displayName;
            if (password) payload.password = password;

            if (Object.keys(payload).length === 0) {
                setMessage({ text: 'No changes to save', type: 'success' });
                setIsSaving(false);
                return;
            }

            const response = await fetch(`${apiUrl}/api/v1/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update profile');
            }

            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setPassword('');
            setConfirmPassword('');
            await refreshToken();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <div className="card-header">
                    <div className="logo-wrapper">
                        <User />
                    </div>
                    <h1>Your Profile</h1>
                    <p className="subtitle">Manage your account settings</p>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                            <div style={{ fontWeight: '500', marginTop: '0.2rem' }}>{user.email}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500' }}>
                            <Shield size={14} />
                            {user.role}
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: user.has_password ? '#2e7d32' : '#eab308' }}>
                        {user.has_password ? (
                            <><CheckCircle size={16} /> Password is set</>
                        ) : (
                            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>No password set (Magic Link only)</span>
                        )}
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            placeholder="Your name"
                        />
                    </div>

                    <div style={{ margin: '1rem 0' }}>
                        <div style={{ height: '1px', backgroundColor: '#e5e7eb', width: '100%' }}></div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
                            {user.has_password ? 'Change Password' : 'Set Password'}
                        </label>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            8-32 characters, with at least one uppercase, lowercase, number, and special character. Leave blank to keep current.
                        </p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '0.5rem' }}
                            placeholder="New password"
                        />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            placeholder="Confirm new password"
                        />
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            <Save size={20} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
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
