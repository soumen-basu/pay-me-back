import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { AddUserModal } from './AddUserModal';

interface UserAdminView {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  session_count: number;
  last_active_time: string | null;
}

export function UserManagement() {
  const { token } = useAuth();
  const [activeUsers, setActiveUsers] = useState<UserAdminView[]>([]);
  const [allUsers, setAllUsers] = useState<UserAdminView[]>([]);
  const [magicLinks, setMagicLinks] = useState<UserAdminView[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'all' | 'magic'>('active');
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAdminView | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isLoggingOutModalOpen, setIsLoggingOutModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const [activeRes, allRes, magicRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/users/active`, { headers }),
        fetch(`${apiUrl}/api/v1/admin/users`, { headers }),
        fetch(`${apiUrl}/api/v1/admin/magic-links`, { headers })
      ]);

      if (activeRes.ok && allRes.ok && magicRes.ok) {
        setActiveUsers(await activeRes.json());
        setAllUsers(await allRes.json());
        setMagicLinks(await magicRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch user management data', error);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
    
    const handleUserChanged = () => fetchData();
    window.addEventListener('user_changed', handleUserChanged);
    return () => window.removeEventListener('user_changed', handleUserChanged);
  }, [token, fetchData]);

  const baseUsers = activeTab === 'active' ? activeUsers : (activeTab === 'all' ? allUsers : magicLinks);
  
  const filteredUsers = baseUsers.filter(u => 
    (u.display_name?.toLowerCase().includes(filterName.toLowerCase()) || u.email.toLowerCase().includes(filterName.toLowerCase())) &&
    u.email.toLowerCase().includes(filterEmail.toLowerCase())
  );

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to deactivate user', error);
    }
  };

  const handleBulkLogout = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      await Promise.all(selectedUserIds.map(userId => 
        fetch(`${apiUrl}/api/v1/admin/users/${userId}/sessions/invalidate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      ));
      setSelectedUserIds([]);
      setIsLoggingOutModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to logout users', error);
    }
  };

  return (
    <PageLayout variant="app">
      <div className="p-10 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">User Management</h2>
            <p className="text-slate-500 mt-1">Audit, authorize, and manage system-wide access.</p>
          </div>
        </div>

        {/* Dashboard Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <BentoTile label="Total Registered" value={allUsers.length.toString()} trendIcon="person" color="primary" />
          <BentoTile label="Currently Active" value={activeUsers.length.toString()} subText="Real-time monitor" icon="bolt" color="emerald" />
          <BentoTile label="Pending Invites" value={magicLinks.length.toString()} subText="Action required" icon="schedule" color="amber" />
          <BentoTile label="Failed Logins" value="1.2%" subText="Security: Optimal" icon="security" color="slate" />
        </div>

        {/* Tabbed Management Section */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <div className="bg-slate-50 px-8 flex justify-between items-center border-b border-slate-100">
            <div className="flex gap-8">
              <TabButton active={activeTab === 'active'} label="Active Users" onClick={() => setActiveTab('active')} />
              <TabButton active={activeTab === 'all'} label="All Registered Users" onClick={() => setActiveTab('all')} />
              <TabButton active={activeTab === 'magic'} label="Pending Magic Links" onClick={() => setActiveTab('magic')} />
            </div>
            <button 
              onClick={() => setIsLoggingOutModalOpen(true)}
              disabled={selectedUserIds.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedUserIds.length > 0 
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer shadow-sm border border-rose-200/50' 
                  : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed hidden md:flex'
              }`}
              title="Log out selected users from all devices"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Log out All Sessions
              {selectedUserIds.length > 0 && (
                <span className="bg-rose-700 text-white rounded-full px-2 py-0.5 text-[10px] ml-1">
                  {selectedUserIds.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-0">
            {/* Filter Bar */}
            <div className="px-8 py-5 bg-white border-b border-slate-50 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FilterField label="Filter by Name" value={filterName} onChange={setFilterName} icon="person_search" placeholder="Search name..." />
              <FilterField label="Filter by Email" value={filterEmail} onChange={setFilterEmail} icon="alternate_email" placeholder="Search email..." />
              <FilterField label="Filter by Last Seen" value="" onChange={() => {}} icon="event" placeholder="Select date range..." />
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 uppercase tracking-widest text-[10px] font-black text-slate-400">
                    <th className="px-8 py-4 w-10"></th>
                    <th className="px-5 py-4">User Profile</th>
                    <th className="px-5 py-4">Last Local IP</th>
                    <th className="px-5 py-4">Role / Status</th>
                    <th className="px-5 py-4 text-right">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors group ${selectedUserIds.includes(u.id) ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                      <td className="px-8 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(prev => [...prev, u.id]);
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                            }
                          }}
                          className="rounded border-slate-200 text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary uppercase">
                            {(u.display_name || u.email).substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{u.display_name || u.email}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-400">192.168.1.XXX</td>
                      <td className="px-5 py-4">
                         <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                              {u.role}
                            </span>
                            {u.is_active && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Active</span>}
                         </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-right mr-4">
                            <p className="text-xs font-bold text-slate-900">{u.session_count > 0 ? 'Logged In' : 'Idle'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{u.last_active_time ? new Date(u.last_active_time).toLocaleDateString() : 'Never'}</p>
                          </div>
                          
                          <button 
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            title="Edit User"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>

                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Deactivate User"
                          >
                            <span className="material-symbols-outlined text-lg">person_remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-400 italic text-sm">No users matching filters found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {(isAddModalOpen || editingUser) && (
          <AddUserModal 
            initialUser={editingUser}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              setIsAddModalOpen(false);
              setEditingUser(null);
              fetchData();
            }}
          />
        )}

        {isLoggingOutModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <span className="material-symbols-outlined">logout</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Logout Users</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6 font-medium">
                Are you sure you want to forcibly log out the <strong className="text-slate-900">{selectedUserIds.length} selected user(s)</strong> from all their active sessions and devices? They will need to sign in again.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsLoggingOutModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkLogout}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 shadow border border-rose-600 rounded-xl transition-all cursor-pointer"
                >
                  Confirm Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function BentoTile({ label, value, trend, subText, icon, color, trendIcon }: any) {
  const colorMap: any = {
    primary: 'border-primary text-primary bg-primary/5',
    emerald: 'border-emerald-500 text-emerald-600 bg-emerald-50',
    amber: 'border-amber-500 text-amber-600 bg-amber-50',
    slate: 'border-slate-500 text-slate-600 bg-slate-50',
  };

  return (
    <div className={`p-5 rounded-2xl border-l-[6px] shadow-sm flex flex-col justify-between h-32 bg-white ${colorMap[color] || colorMap.primary}`}>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-3xl font-black tracking-tighter text-slate-900">{value}</span>
      <div className="flex items-center gap-1 text-[11px] font-bold">
        {trend && (
          <><span className="material-symbols-outlined text-sm">{trendIcon}</span> {trend}</>
        )}
        {subText && (
          <><span className={`material-symbols-outlined text-sm ${icon === 'bolt' ? 'animate-pulse' : ''}`}>{icon}</span> {subText}</>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`py-4 text-sm font-black transition-all tracking-tight border-b-2
        ${active ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}
      `}
    >
      {label}
    </button>
  );
}

function FilterField({ label, value, onChange, icon, placeholder }: any) {
  return (
    <div className="space-y-1.5 font-bold">
      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 px-1">
        <span className="material-symbols-outlined text-[12px]">{icon}</span>
        {label}
      </label>
      <input 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50/50 border-slate-100 rounded-xl py-3 px-4 text-xs focus:ring-4 focus:ring-primary/10 transition-all border font-bold" 
        placeholder={placeholder} 
        type="text" 
      />
    </div>
  );
}


