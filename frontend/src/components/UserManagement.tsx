import { useState, useEffect } from 'react';
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
  const [magicLinks, setMagicLinks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'all' | 'magic'>('active');
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Quick Registration State
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPassword, setQuickPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, magicRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/users/active`, { headers }),
        fetch(`${apiUrl}/api/v1/admin/magic-links`, { headers })
      ]);

      if (usersRes.ok && magicRes.ok) {
        setActiveUsers(await usersRes.json());
        setMagicLinks(await magicRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch user management data', error);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const filteredUsers = activeUsers.filter(u => 
    (u.display_name?.toLowerCase().includes(filterName.toLowerCase()) || u.email.toLowerCase().includes(filterName.toLowerCase())) &&
    u.email.toLowerCase().includes(filterEmail.toLowerCase())
  );

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: quickEmail,
          display_name: quickName || null,
          password: quickPassword,
          role: 'user',
          is_active: true,
        }),
      });

      if (response.ok) {
        setQuickName('');
        setQuickEmail('');
        setQuickPassword('');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to register user', error);
    } finally {
      setIsRegistering(false);
    }
  };

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

  return (
    <PageLayout variant="app">
      <div className="p-10 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">User Management</h2>
            <p className="text-slate-500 mt-1">Audit, authorize, and manage system-wide access.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-slate-900 px-6 py-3 rounded-xl text-sm font-bold tracking-widest uppercase shadow-md hover:scale-[1.02] transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add New User
          </button>
        </div>

        {/* Dashboard Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <BentoTile label="Total Registered" value="1,248" trend="+12% this month" trendIcon="trending_up" color="primary" />
          <BentoTile label="Currently Active" value={activeUsers.length.toString()} subText="Real-time monitor" icon="bolt" color="emerald" />
          <BentoTile label="Pending Invites" value={magicLinks.length.toString()} subText="Action required" icon="schedule" color="amber" />
          <BentoTile label="Failed Logins" value="1.2%" subText="Security: Optimal" icon="security" color="slate" />
        </div>

        {/* Tabbed Management Section */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <div className="bg-slate-50 px-8 flex gap-8 border-b border-slate-100">
            <TabButton active={activeTab === 'active'} label="Active Users" onClick={() => setActiveTab('active')} />
            <TabButton active={activeTab === 'all'} label="All Registered Users" onClick={() => setActiveTab('all')} />
            <TabButton active={activeTab === 'magic'} label="Pending Magic Links" onClick={() => setActiveTab('magic')} />
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
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-4">
                        <input type="checkbox" className="rounded border-slate-200 text-primary focus:ring-primary" />
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

        {/* Bottom Section: Quick Registration and Magic Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">person_add_alt</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Quick Registration</h3>
            </div>
            <form onSubmit={handleQuickRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Display Name</label>
                <input 
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-slate-50 border-transparent rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-slate-300" 
                  placeholder="e.g. Jean-Luc Picard" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
                <input 
                  required
                  type="email"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  className="w-full bg-slate-50 border-transparent rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-slate-300" 
                  placeholder="captain@starfleet.edu" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Initial Password</label>
                <input 
                  required
                  type="password"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  className="w-full bg-slate-50 border-transparent rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-slate-300" 
                  placeholder="••••••••••••" 
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isRegistering}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50"
                >
                  {isRegistering ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </section>

          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pending Magic Links</h3>
                <p className="text-xs text-slate-500 font-medium">Unclaimed authentication tokens currently active</p>
              </div>
              <button className="text-rose-500 text-xs font-bold hover:underline uppercase tracking-widest">Revoke All</button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
              <div className="divide-y divide-slate-50">
                {magicLinks.map((ml, i) => (
                  <div key={i} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">key</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ml.email}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate w-48">{ml.magic_token || 'pmb_tk_...'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Expires</p>
                        <p className="text-xs font-bold text-amber-600">{ml.magic_token_expires_at ? new Date(ml.magic_token_expires_at).toLocaleTimeString() : 'Expired'}</p>
                      </div>
                      <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  </div>
                ))}
                {magicLinks.length === 0 && (
                  <div className="py-20 text-center text-slate-400 italic text-sm">No active magic links</div>
                )}
              </div>
            </div>
          </section>
        </div>

        {isAddModalOpen && (
          <AddUserModal 
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => {
              setIsAddModalOpen(false);
              fetchData();
            }}
          />
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


