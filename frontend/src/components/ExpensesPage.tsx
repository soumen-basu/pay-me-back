import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';

// ── Interfaces ──

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
  return CATEGORY_ICONS[name.toLowerCase().trim()] || 'category';
}

export function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try {
      const [expData, catData] = await Promise.all([
        api.get<Expense[]>('/api/v1/expenses'),
        api.get<Category[]>('/api/v1/categories'),
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
  }, [fetchData]);

  // ── Filtering ──
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery]);

  const formatCurrency = (amount: number): string => {
    const symbol = user?.preferred_currency || '₹';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </label>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-primary text-slate-900 font-bold px-5 py-2.5 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">add</span>
        Add Expense
      </button>
    </div>
  );

  return (
    <PageLayout variant="app" topNavActions={topNavActions}>
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Expenses</h1>
          <p className="text-slate-500 mt-1">Track and manage your individual spending items.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-20 flex justify-center">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-20 text-center">
              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
              </div>
              <p className="text-slate-400 font-medium italic">No expenses found.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-primary font-bold hover:underline"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Item</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-4">Date</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-4">Category</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-4">Status</th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
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
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        exp.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' : 
                        exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {exp.status}
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

      {isModalOpen && (
        <AddExpenseModal 
          categories={categories} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }} 
        />
      )}
    </PageLayout>
  );
}

// ── AddExpenseModal Sub-component ──

function AddExpenseModal({ categories, onClose, onSuccess }: { 
  categories: Category[], 
  onClose: () => void,
  onSuccess: () => void 
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryName, setCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to first category if available
  useEffect(() => {
    if (categories.length > 0 && !categoryName) {
      setCategoryName(categories[0].name);
    } else if (categories.length === 0 && !categoryName) {
      setCategoryName('Other');
    }
  }, [categories, categoryName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !categoryName) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/api/v1/expenses', {
        description,
        amount: parseFloat(amount),
        date,
        category_name: categoryName,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.detail || 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Expense</h2>
            <button onClick={onClose} className="size-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">What did you buy?</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                placeholder="e.g. Starbucks Latte"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">How much?</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-5 py-3.5 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">When?</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Category</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium appearance-none"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                {categories.length === 0 && <option value="Other">Other</option>}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-slate-900 font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
