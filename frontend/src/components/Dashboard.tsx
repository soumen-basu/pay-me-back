import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { DonutChart } from './charts/DonutChart';
import { api } from '../services/api';

// ── TypeScript interfaces matching backend models ──

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_name: string;
  status: string;
  owner_id: number;
  claim_id: string | null;
  created_at: string;
}

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

// ── Color palette for status badges ──
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

// ── Category colors for the donut chart ──
const CATEGORY_COLORS = [
  '#13ec78', // primary green
  '#8b5cf6', // purple
  '#cbd5e1', // slate-300
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
];

// ── Material icon names per category (heuristic mapping) ──
const CATEGORY_ICONS: Record<string, string> = {
  education: 'school',
  food: 'restaurant',
  travel: 'flight',
  medical: 'medical_services',
  office: 'business_center',
  subs: 'subscriptions',
  shopping: 'shopping_bag',
  other: 'category',
};

function getCategoryIcon(name: string): string {
  const key = name.toLowerCase().trim();
  return CATEGORY_ICONS[key] || 'category';
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [expData, claimData] = await Promise.all([
        api.get<Expense[]>('/api/v1/expenses'),
        api.get<Claim[]>('/api/v1/claims?role=submitter'),
      ]);
      setExpenses(expData);
      setClaims(claimData);
    } catch {
      // silently fail — dashboard shows zeroed state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Computed stats ──
  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const pendingClaims = useMemo(
    () => claims.filter((c) => c.status === 'OPEN'),
    [claims]
  );

  const approvedThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses
      .filter((e) => e.status === 'APPROVED' && new Date(e.created_at) >= monthStart)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // ── Active claims (OPEN only, latest first, max 5) ──
  const activeClaims = useMemo(
    () =>
      [...claims]
        .filter((c) => c.status === 'OPEN')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [claims]
  );

  // ── Spending by category ──
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category_name || 'Other';
      map[cat] = (map[cat] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
  }, [expenses]);

  // ── Recent expenses (latest 5) ──
  const recentExpenses = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [expenses]
  );

  const formatCurrency = (amount: number): string => {
    const symbol = user?.preferred_currency || '₹';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const displayName = user?.display_name || user?.email?.split('@')[0] || 'there';

  // TopNav right-side actions
  const topNavActions = (
    <div className="flex items-center gap-3">
      <label className="hidden md:flex flex-col min-w-40 h-10 max-w-64">
        <div className="flex w-full flex-1 items-stretch rounded-full h-full bg-slate-100 border border-transparent focus-within:border-primary/50 transition-all">
          <div className="text-slate-500 flex items-center justify-center pl-4">
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <input
            className="flex w-full min-w-0 flex-1 border-none bg-transparent focus:ring-0 h-full placeholder:text-slate-400 text-sm font-medium px-2 outline-none"
            placeholder="Search claims..."
          />
        </div>
      </label>
      <button
        onClick={() => navigate('/claims/new')}
        className="flex items-center gap-2 bg-primary text-slate-900 font-bold px-5 py-2.5 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">add</span>
        New Claim
      </button>
    </div>
  );

  if (loading) {
    return (
      <PageLayout variant="app">
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="app" topNavActions={topNavActions}>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-slate-500 mt-1">Check your spending and active claims.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Total Spent */}
          <div className="flex flex-col gap-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Spent</p>
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalSpent)}</p>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
              <span className="text-primary text-sm font-bold">{expenses.length} expenses</span>
            </div>
          </div>

          {/* Pending Claims */}
          <div className="flex flex-col gap-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Claims</p>
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500">pending_actions</span>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900">
              <span className="text-3xl">{pendingClaims.length}</span>
              <span className="text-base font-medium text-slate-400 ml-2">Claims</span>
            </p>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-slate-400 text-sm">schedule</span>
              <span className="text-slate-400 text-sm font-medium">Awaiting review</span>
            </div>
          </div>

          {/* Approved This Month */}
          <div className="flex flex-col gap-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Approved This Month</p>
              <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500">check_circle</span>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(approvedThisMonth)}</p>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-green-500 text-sm">trending_down</span>
              <span className="text-green-500 text-sm font-bold">
                {expenses.filter((e) => e.status === 'APPROVED').length} approved
              </span>
            </div>
          </div>
        </div>

        {/* Active Claims + Spending Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
          {/* Active Claims — 3 columns */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Claims</h2>
              <button
                onClick={() => navigate('/claims')}
                className="text-primary text-sm font-bold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {activeClaims.length === 0 && (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment</span>
                  <p className="text-slate-400 font-medium">No active claims. Create one to get started!</p>
                </div>
              )}

              {activeClaims.map((claim) => {
                // Find expenses linked to this claim
                const claimExpenses = expenses.filter((e) => e.claim_id === claim.id);
                const claimTotal = claimExpenses.reduce((sum, e) => sum + e.amount, 0);
                const statusStyle = STATUS_COLORS[claim.status] || STATUS_COLORS.OPEN;

                return (
                  <div
                    key={claim.id}
                    className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/claims/${claim.id}`)}
                  >
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">assignment</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{claim.title}</p>
                      <p className="text-sm text-slate-500">
                        Submitted on {formatDate(claim.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">{formatCurrency(claimTotal)}</p>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {claim.status === 'OPEN' ? 'Under Review' : claim.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spending by Category — 2 columns */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4">Spending by Category</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
              {categorySpending.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-slate-300">pie_chart</span>
                  <p className="text-slate-400 font-medium mt-2">No expenses yet</p>
                </div>
              ) : (
                <DonutChart
                  segments={categorySpending}
                  total={formatCurrency(totalSpent)}
                  size={180}
                />
              )}
            </div>
          </div>
        </div>

        {/* Recent Expenses + Referral CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Recent Expenses Table — 3 columns */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4">Recent Expenses</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {recentExpenses.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                  <p className="text-slate-400 font-medium mt-2">No expenses recorded yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-3">Item</th>
                      <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                      <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Category</th>
                      <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExpenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">{exp.description}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">{formatDate(exp.date)}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                            <span className="material-symbols-outlined text-xs">{getCategoryIcon(exp.category_name)}</span>
                            {exp.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Referral CTA Card — 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 size-24 border-2 border-white rounded-full" />
                <div className="absolute bottom-4 left-4 size-16 border-2 border-white rounded-full" />
              </div>

              <div className="relative z-10">
                <h3 className="text-xl font-extrabold mb-2">Refer a Friend</h3>
                <p className="text-white/80 text-sm mb-6">
                  Get ₹500 in credits for every friend you refer to Pay Me Back!
                </p>
                <button className="bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform cursor-pointer shadow-md">
                  Invite Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
