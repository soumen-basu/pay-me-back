import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';

// ── Interfaces ──

interface Claim {
  id: string;
  title: string;
  description: string | null;
  status: string;
  submitter_id: number;
  approver_emails: string[] | null;
  viewer_emails: string[] | null;
  created_at: string;
}

interface Expense {
  id: string;
  amount: number;
  claim_id: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Needs Review' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Closed' },
};

export function ApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'APPROVED' | 'REJECTED' | 'ALL'>('OPEN');

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try {
      const [claimData, expData] = await Promise.all([
        api.get<Claim[]>('/api/v1/claims/?role=approver'),
        api.get<Expense[]>('/api/v1/expenses/?role=approver'), // Let backend handle expense filtering if supported, or fetch all that the user can see. Let's just fetch all accessible to approver.
      ]);
      setClaims(claimData);
      setExpenses(expData);
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filtering ──
  const filteredClaims = useMemo(() => {
    return claims.filter(c => activeTab === 'ALL' || c.status === activeTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [claims, activeTab]);

  const formatCurrency = (amount: number): string => {
    const symbol = user?.preferred_currency || '₹';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <PageLayout variant="app">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Approvals</h1>
          <p className="text-slate-500 mt-1">Review and manage claims assigned to you.</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto no-scrollbar">
          <div className="flex border-b border-slate-200 gap-8 min-w-max">
            {(['OPEN', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center pb-3 transition-all cursor-pointer border-b-4 ${
                  activeTab === tab ? 'border-primary text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-sm font-bold tracking-wide uppercase">
                  {tab === 'ALL' ? 'History' : tab === 'OPEN' ? 'Pending' : tab.toLowerCase()}
                </span>
                <span className="text-[10px] font-black opacity-50">
                  {claims.filter(c => tab === 'ALL' || c.status === tab).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-slate-300">fact_check</span>
              </div>
              <p className="text-slate-400 font-medium italic">No claims pending your approval.</p>
            </div>
          ) : (
            filteredClaims.map((claim) => {
              const claimExpenses = expenses.filter((e) => e.claim_id === claim.id);
              const claimTotal = claimExpenses.reduce((sum, e) => sum + e.amount, 0);
              const status = STATUS_COLORS[claim.status] || STATUS_COLORS.OPEN;

              return (
                <div
                  key={claim.id}
                  onClick={() => navigate(`/claims/${claim.id}/review`)}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="size-14 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">fact_check</span>
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold text-lg leading-tight">{claim.title}</h3>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        Submitted by User #{claim.submitter_id} on {formatDate(claim.created_at)} • {claimExpenses.length} items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-slate-900 font-black text-2xl tracking-tight">{formatCurrency(claimTotal)}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-1 ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-slate-900 transition-all">
                      <span className="material-symbols-outlined text-xl">chevron_right</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageLayout>
  );
}
