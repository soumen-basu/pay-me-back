import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';
import { useTierFeatures } from '../contexts/TierContext';
import { fetchCurrencies, groupByCurrency, formatCurrencyTotals } from '../utils/currency';
import type { CurrencyInfo } from '../utils/currency';

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
  currency_code: string;
  claim_id: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Under Review' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Closed' },
};

export function ClaimsPage() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'APPROVED' | 'REJECTED'>('ALL');
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const { features } = useTierFeatures();

  const isQuotaExceeded = !!(features && features.quotas.max_claims_per_month.current_usage >= features.quotas.max_claims_per_month.limit);

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try {
      const [claimData, expData] = await Promise.all([
        api.get<Claim[]>('/api/v1/claims/?role=submitter'),
        api.get<Expense[]>('/api/v1/expenses/'),
      ]);
      setClaims(claimData);
      setExpenses(expData);
    } catch (err) {
      console.error('Failed to fetch claims', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCurrencies().then(setCurrencies);
  }, [fetchData]);

  // ── Filtering ──
  const filteredClaims = useMemo(() => {
    return claims.filter(c => activeTab === 'ALL' || c.status === activeTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [claims, activeTab]);

  // Use the shared currency utility — no local formatCurrency needed

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const topNavActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => !isQuotaExceeded && navigate('/claims/new')}
        disabled={isQuotaExceeded}
        className={`flex items-center justify-center size-9 md:size-auto md:gap-2 font-bold md:px-5 md:py-2.5 rounded-full shadow-lg transition-transform ${isQuotaExceeded ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-primary text-slate-900 hover:scale-105 cursor-pointer shadow-primary/20'}`}
        title={isQuotaExceeded ? 'Monthly claim limit reached' : 'Create Claim'}
      >
        {isQuotaExceeded ? (
          <span className="material-symbols-outlined text-xl">block</span>
        ) : (
          <span className="material-symbols-outlined text-xl">add</span>
        )}
        <span className="hidden md:inline">{isQuotaExceeded ? 'Limit Reached' : 'Create Claim'}</span>
      </button>
    </div>
  );

  return (
    <PageLayout variant="app" topNavActions={topNavActions}>
      <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Your Claims</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Manage and track your reimbursement requests.</p>
          {isQuotaExceeded && (
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm max-w-xl">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <div className="text-sm">
                <p className="font-bold">Monthly Quota Exceeded</p>
                <p>You have reached your limit of {features.quotas.max_claims_per_month.limit} claims this month. Upgrade to Pro to submit more.</p>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto no-scrollbar">
          <div className="flex border-b border-slate-200 gap-8 min-w-max">
            {(['ALL', 'OPEN', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center pb-3 transition-all cursor-pointer border-b-4 ${
                  activeTab === tab ? 'border-primary text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-sm font-bold tracking-wide uppercase">
                  {tab === 'ALL' ? 'Total History' : tab === 'OPEN' ? 'Pending' : tab.toLowerCase()}
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
                <span className="material-symbols-outlined text-4xl text-slate-300">assignment</span>
              </div>
              <p className="text-slate-400 font-medium italic">No claims found.</p>
              {!isQuotaExceeded && (
                <button 
                  onClick={() => navigate('/claims/new')}
                  className="mt-4 text-primary font-bold hover:underline cursor-pointer"
                >
                  Create your first claim
                </button>
              )}
            </div>
          ) : (
            filteredClaims.map((claim) => {
              const claimExpenses = expenses.filter((e) => e.claim_id === claim.id);
              const claimTotalByCurrency = groupByCurrency(claimExpenses);
              const status = STATUS_COLORS[claim.status] || STATUS_COLORS.OPEN;

              return (
                <div
                  key={claim.id}
                  onClick={() => navigate(`/claims/${claim.id}`)}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">assignment</span>
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold text-lg leading-tight">{claim.title}</h3>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        Submitted on {formatDate(claim.created_at)} • {claimExpenses.length} items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-slate-900 font-black text-2xl tracking-tight">{formatCurrencyTotals(claimTotalByCurrency, currencies)}</p>
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
