import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';
import { AddExpenseModal } from './AddExpenseModal';
import { useExpenseSelection } from '../contexts/ExpenseSelectionContext';
import { useTierFeatures } from '../contexts/TierContext';
import { fetchCurrencies, formatAmount } from '../utils/currency';
import type { CurrencyInfo } from '../utils/currency';

// ── Interfaces ──

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_name: string;
  currency_code: string;
  status: string;
  owner_id: number;
  claim_id: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  education: 'school', food: 'restaurant', travel: 'flight',
  medical: 'medical_services', office: 'business_center', subs: 'subscriptions',
  shopping: 'shopping_bag', other: 'category',
};

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[(name || '').toLowerCase().trim()] || 'category';
}

export function ExpensesPage() {
  const { selectedExpenseIds, toggleExpense, clearSelection } = useExpenseSelection();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const { features } = useTierFeatures();

  const isQuotaExceeded = features && features.quotas.max_expenses_per_month.current_usage >= features.quotas.max_expenses_per_month.limit;

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try {
      const [expData, catData] = await Promise.all([
        api.get<Expense[]>('/api/v1/expenses/'),
        api.get<Category[]>('/api/v1/categories/'),
      ]);
      setExpenses(expData);
      setCategories(catData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCurrencies().then(setCurrencies);
    
    // Listen for global expense additions (from sidebar or anywhere)
    const handleExpenseAdded = () => fetchData();
    window.addEventListener('expense_added', handleExpenseAdded);
    return () => window.removeEventListener('expense_added', handleExpenseAdded);
  }, [fetchData]);

  // ── Filtering ──
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      (e.description || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (e.category_name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery]);

  // Use the shared currency utility — no local formatCurrency needed

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // TopNav right-side actions
  const topNavActions = (
    <div className="flex items-center gap-2">
      <label className="flex flex-col min-w-40 h-9 md:h-10 max-w-64">
        <div className="flex w-full flex-1 items-stretch rounded-full h-full bg-slate-100 border border-transparent focus-within:border-primary/50 transition-all">
          <div className="text-slate-500 flex items-center justify-center pl-3 md:pl-4">
            <span className="material-symbols-outlined text-lg">search</span>
          </div>
          <input
            className="flex w-full min-w-0 flex-1 border-none bg-transparent focus:ring-0 h-full placeholder:text-slate-400 text-xs md:text-sm font-medium px-2 outline-none"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </label>
      <button
        onClick={() => !isQuotaExceeded && setIsModalOpen(true)}
        disabled={isQuotaExceeded}
        className={`flex items-center justify-center size-9 md:size-auto md:gap-2 font-bold md:px-5 md:py-2.5 rounded-full shadow-lg transition-transform ${isQuotaExceeded ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-primary text-slate-900 hover:scale-105 cursor-pointer shadow-primary/20'}`}
        title={isQuotaExceeded ? 'Monthly expense limit reached' : 'Add Expense'}
      >
        {isQuotaExceeded ? (
          <span className="material-symbols-outlined text-xl">block</span>
        ) : (
          <span className="material-symbols-outlined text-xl">add</span>
        )}
        <span className="hidden md:inline">{isQuotaExceeded ? 'Limit Reached' : 'Add Expense'}</span>
      </button>
    </div>
  );

  return (
    <PageLayout variant="app" topNavActions={topNavActions}>
      <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Your Expenses</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Track and manage your individual spending items.</p>
          {isQuotaExceeded && (
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm max-w-xl">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <div className="text-sm">
                <p className="font-bold">Monthly Quota Exceeded</p>
                <p>You have reached your limit of {features.quotas.max_expenses_per_month.limit} expenses this month. Upgrade to Pro to add more.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden table-container">
          {loading ? (
            <div className="p-12 md:p-20 flex justify-center">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 md:p-20 text-center">
              <div className="size-16 md:size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl md:text-4xl text-slate-300">receipt_long</span>
              </div>
              <p className="text-slate-400 font-medium italic">No expenses found.</p>
              {!isQuotaExceeded && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  Add your first expense
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-12 px-6 py-4"></th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-4">Item</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-4">Date</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-4">Category</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-4">Status</th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => {
                  const isAssigned = !!exp.claim_id;
                  const isEditable = !isAssigned && exp.status === 'OPEN';
                  const isSelected = selectedExpenseIds.includes(exp.id);
                  return (
                  <tr 
                    key={exp.id} 
                    className={`border-b border-slate-50 transition-colors group ${
                      isSelected ? 'bg-primary/5' : 
                      !isEditable ? 'bg-slate-50/30 opacity-70' : 'hover:bg-slate-50/50'
                    } ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => {
                      if (isEditable) setEditingExpense(exp);
                    }}
                  >
                    <td className="px-6 py-4">
                      {isEditable && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpense(exp.id);
                          }}
                          className={`size-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary border-primary text-slate-900' : 'border-slate-300 hover:border-primary/50 text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-4">
                      <p className={`font-bold text-sm ${isEditable ? 'text-slate-900' : 'text-slate-600'}`}>{exp.description}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{formatDate(exp.date)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isEditable ? 'bg-slate-100 text-slate-600' : 'bg-slate-100/50 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-xs">{getCategoryIcon(exp.category_name)}</span>
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        exp.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' : 
                        exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {!isEditable && <span className="material-symbols-outlined text-[12px]">lock</span>}
                        {exp.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-sm ${isEditable ? 'text-slate-900' : 'text-slate-600'}`}>
                      {formatAmount(exp.amount, exp.currency_code || 'INR', currencies)}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedExpenseIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <span className="text-white font-medium text-sm">
              <span className="font-bold">{selectedExpenseIds.length}</span> expenses selected
            </span>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="flex gap-2">
              <button 
                onClick={clearSelection}
                className="text-slate-400 hover:text-white px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button 
                onClick={() => {
                   // For now, redirect to /claims/new where we will ingest these
                   window.location.href = '/claims/new';
                }}
                className="bg-primary text-slate-900 hover:bg-primary/90 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">add_task</span>
                Add to Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddExpenseModal 
          initialCategories={categories}
          expenses={expenses}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }} 
        />
      )}

      {editingExpense && (
        <AddExpenseModal
          initialCategories={categories}
          initialExpense={editingExpense}
          expenses={expenses}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null);
            fetchData();
          }}
        />
      )}
    </PageLayout>
  );
}
