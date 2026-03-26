import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';

interface MetricTrend {
  value: string | number;
  trend?: number;
  status?: string;
}

interface EfficiencyMetric {
  definition: string;
  value: string;
  trend: number;
  status: string;
}

interface PerformanceData {
  mau: MetricTrend;
  dau: MetricTrend;
  transaction_efficiency: EfficiencyMetric[];
  settlement_rate: number;
  avg_approval_time: MetricTrend;
}

interface TotalStats {
  total_payouts: number;
  claims_processed: number;
  fraud_mitigation: number;
  adoption_rate: number;
}

export function AdminDashboard() {
  const { token } = useAuth();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [stats, setStats] = useState<TotalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const headers = { Authorization: `Bearer ${token}` };

        const [perfRes, statsRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/admin/performance`, { headers }),
          fetch(`${apiUrl}/api/v1/admin/stats`, { headers })
        ]);

        if (perfRes.ok && statsRes.ok) {
          const perfData = await perfRes.json();
          const statsData = await statsRes.json();
          setPerformance(perfData);
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch admin dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return (
      <PageLayout variant="app">
        <div className="p-10 flex items-center justify-center min-h-[400px]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="app">
      <div className="p-10 space-y-10 animate-in fade-in duration-500">
        <header className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-1">Ecosystem Performance</h2>
            <p className="text-slate-500">Real-time health metrics and user behavior analysis.</p>
          </div>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button className="px-5 py-2 text-xs font-semibold rounded-lg bg-white shadow-sm text-primary">All Time</button>
            <button className="px-5 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors">Last Month</button>
            <button className="px-5 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors">Last Week</button>
          </div>
        </header>

        {performance && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MAU Card */}
              <div className="bg-white rounded-xl p-8 border-l-[3px] border-primary shadow-sm relative overflow-hidden">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 block">Monthly Active Users</span>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-900">{performance.mau.value}</span>
                  {performance.mau.trend !== undefined && (
                    <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${performance.mau.trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                      <span className="material-symbols-outlined text-xs mr-1">{performance.mau.trend >= 0 ? 'trending_up' : 'trending_down'}</span>
                      {Math.abs(performance.mau.trend)}%
                    </span>
                  )}
                </div>
                {/* Mock chart bars */}
                <div className="mt-8 flex items-end gap-1 h-16">
                   {[30, 50, 20, 70, 90, 80, 60].map((h, i) => (
                     <div key={i} className={`w-full bg-primary/${i === 5 ? '100' : '20'} rounded-t-sm`} style={{ height: `${h}%` }}></div>
                   ))}
                </div>
              </div>

              {/* DAU Card */}
              <div className="bg-white rounded-xl p-8 border-l-[3px] border-primary shadow-sm relative overflow-hidden">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 block">Daily Active Users</span>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-900">{performance.dau.value}</span>
                  {performance.dau.trend !== undefined && (
                    <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${performance.dau.trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                      <span className="material-symbols-outlined text-xs mr-1">{performance.dau.trend >= 0 ? 'trending_up' : 'trending_down'}</span>
                      {Math.abs(performance.dau.trend)}%
                    </span>
                  )}
                </div>
                {/* Mock chart bars */}
                <div className="mt-8 flex items-end gap-1 h-16">
                   {[60, 70, 40, 80, 100, 30, 20].map((h, i) => (
                     <div key={i} className={`w-full bg-primary/${i < 5 ? '100' : '20'} rounded-t-sm`} style={{ height: `${h}%` }}></div>
                   ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Efficiency Table */}
              <div className="lg:col-span-2 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="px-8 py-6 bg-white flex justify-between items-center border-b border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Transaction Efficiency</h3>
                  <span className="material-symbols-outlined text-slate-400 cursor-pointer">more_vert</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Metric Definition</th>
                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Current Value</th>
                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Trend</th>
                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {performance.transaction_efficiency.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{m.definition}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right font-mono font-bold text-slate-900 text-lg">{m.value}</td>
                          <td className="px-8 py-6 text-right">
                            <span className={`text-xs font-bold ${m.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.trend >= 0 ? '+' : ''}{m.trend}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest 
                              ${m.status === 'Healthy' || m.status === 'Growth' || m.status === 'Stable' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Side Panels */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 border-l-[3px] border-primary shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Settlement Rate</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-extrabold tracking-tight">{performance.settlement_rate.toFixed(1)}%</span>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${performance.settlement_rate}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border-l-[3px] border-amber-600 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-amber-600">timer</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Avg Approval Time</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-extrabold tracking-tight">{performance.avg_approval_time.value}</span>
                    <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded">{performance.avg_approval_time.trend}d</span>
                  </div>
                </div>

                <div className="bg-primary p-6 rounded-xl relative overflow-hidden group shadow-lg">
                  <div className="absolute -right-4 -top-4 text-white/10 transition-transform group-hover:scale-110 duration-500">
                    <span className="material-symbols-outlined text-9xl">auto_awesome</span>
                  </div>
                  <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1 relative z-10">Generate Report</h4>
                  <p className="text-white/70 text-xs mb-6 relative z-10 leading-relaxed">Compile full Q3 fiscal data for all stakeholders.</p>
                  <button className="w-full py-3 bg-white text-primary font-bold text-[10px] uppercase tracking-[0.15em] rounded-lg shadow-lg hover:shadow-xl transition-all relative z-10">Export CSV/PDF</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon="payments" label="Total Payouts" value={stats ? `$${(stats.total_payouts / 1000000).toFixed(1)}M` : '$1.2M'} />
          <StatCard icon="receipt_long" label="Claims Processed" value={stats ? stats.claims_processed.toLocaleString() : '4.8k'} />
          <StatCard icon="verified_user" label="Fraud Mitigation" value={stats ? `${stats.fraud_mitigation}%` : '99.8%'} />
          <StatCard icon="rocket_launch" label="Adoption Rate" value={stats ? `+${stats.adoption_rate}%` : '+22%'} />
        </div>
      </div>
    </PageLayout>
  );
}

function StatCard({ icon, label, value }: { icon: string, label: string, value: string }) {
  return (
    <div className="bg-white p-6 rounded-xl flex flex-col items-center text-center shadow-sm border border-slate-100">
      <div className="p-4 bg-primary/10 rounded-full mb-4">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</span>
    </div>
  );
}
