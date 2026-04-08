import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialUser?: any;
}

export function AddUserModal({ onClose, onSuccess, initialUser }: AddUserModalProps) {
  const { token } = useAuth();
  const [email, setEmail] = useState(initialUser?.email || '');
  const [displayName, setDisplayName] = useState(initialUser?.display_name || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialUser?.role || 'user');
  const [isActive, setIsActive] = useState(initialUser?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const url = isEditMode 
        ? `${apiUrl}/api/v1/admin/users/${initialUser.id}`
        : `${apiUrl}/api/v1/admin/users`;
      
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const body: any = {
        display_name: displayName || null,
        role,
        is_active: isActive,
      };

      if (!isEditMode) {
        body.email = email;
      }

      if (password) {
        body.password = password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('user_changed', { 
          detail: { type: isEditMode ? 'update' : 'create', user: await response.json() } 
        }));
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.detail || `Failed to ${isEditMode ? 'update' : 'create'} user`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900">{isEditMode ? 'Edit User' : 'Provision New User'}</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">{isEditMode ? 'Modify account details and permissions.' : 'Grant access and define system roles.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-50 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={isEditMode}
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Display Name (Optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{isEditMode ? 'Change Password (optional)' : 'Password'}</label>
              <input
                required={!isEditMode}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditMode ? "Leave blank to keep current" : "••••••••••••"}
                className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border-slate-100 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all appearance-none outline-none"
                >
                  <option value="user">Standard User</option>
                  <option value="approver">Approver</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Account Status</label>
                <div 
                  onClick={() => setIsActive(!isActive)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                    isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  <span className="text-sm font-bold">{isActive ? 'Active' : 'Deactivated'}</span>
                  <span className="material-symbols-outlined">{isActive ? 'check_circle' : 'cancel'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-[2] bg-primary text-slate-900 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {loading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Provision User')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
