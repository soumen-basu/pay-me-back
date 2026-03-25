import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';
import { useAuth } from './AuthProvider';

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string | null;
  category_name: string;
  status: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  education: 'school', food: 'restaurant', 'food & drink': 'restaurant', travel: 'flight',
  medical: 'medical_services', office: 'business_center', 'office supplies': 'print', subs: 'subscriptions',
  shopping: 'shopping_bag', software: 'code', other: 'category',
};

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[(name || '').toLowerCase().trim()] || 'category';
}

export function CategoriesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [catData, expData] = await Promise.all([
        api.get<Category[]>('/api/v1/categories'),
        api.get<Expense[]>('/api/v1/expenses')
      ]);
      setCategories(catData);
      setExpenses(expData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Are you sure you want to remove the "${name}" category?`)) return;
    try {
      await api.delete(`/api/v1/categories/${encodeURIComponent(name)}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete category');
    }
  };

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.post('/api/v1/categories', { name: newCatName.trim() });
      setNewCatName('');
      setIsAdding(false);
      fetchData();
    } catch (err: any) {
      if (err.message?.includes('400')) {
        alert('This category already exists and is active.');
      } else {
        console.error(err);
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    const symbol = user?.preferred_currency || '₹';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <PageLayout variant="app">
      <div className="max-w-7xl mx-auto px-8 py-8">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Categories</h1>
            <p className="text-slate-500">Manage your spending groups and view open expenses.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 text-primary font-bold hover:bg-primary/30 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined font-black">add_circle</span>
            Add New Category
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map(cat => {
            const catExpenses = expenses.filter(e => e.category_name === cat.name && e.status === 'OPEN');
            const recentTwo = catExpenses.slice(0, 2);

            return (
              <div key={cat.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow relative group">
                {/* Delete Button */}
                <button 
                  onClick={() => handleDelete(cat.name)}
                  className="absolute top-6 right-6 size-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer"
                  title="Remove Category"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>

                {/* Icon */}
                <div className="size-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl">{getCategoryIcon(cat.name)}</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-900 mb-2">{cat.name}</h3>
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-full">
                    {catExpenses.length} OPEN {catExpenses.length === 1 ? 'EXPENSE' : 'EXPENSES'}
                  </span>
                </div>

                {/* Expense Previews */}
                <div className="flex-1 space-y-4 mb-6">
                  {catExpenses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center pt-4">
                      <div className="size-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-xl">check</span>
                      </div>
                      <p className="text-xs font-medium text-slate-400">All caught up!</p>
                    </div>
                  ) : (
                    recentTwo.map(e => (
                      <div key={e.id} className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{e.description}</p>
                          <p className="text-[11px] text-slate-400">{formatDate(e.date)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(e.amount)}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Action */}
                <button 
                  onClick={() => navigate('/expenses')}
                  disabled={catExpenses.length === 0}
                  className={`w-full py-2.5 rounded-full border text-sm font-bold transition-colors ${
                    catExpenses.length === 0 
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 text-primary hover:border-primary/30 hover:bg-primary/5 cursor-pointer'
                  }`}
                >
                  View All Expenses
                </button>
              </div>
            );
          })}

          {/* Create New Card */}
          {isAdding ? (
            <div className="rounded-3xl p-6 border-2 border-primary border-dashed bg-primary/5 flex flex-col justify-center items-center min-h-[350px]">
              <h3 className="font-bold text-slate-900 mb-4">New Category</h3>
              <input 
                autoFocus
                type="text"
                placeholder="Category Name"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none mb-4 text-center font-bold"
              />
              <div className="flex gap-2 w-full">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-2 font-bold bg-primary text-slate-900 rounded-xl hover:bg-primary/90 transition-colors shadow-sm cursor-pointer border border-primary/20">Save</button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setIsAdding(true)}
              className="rounded-3xl p-6 border-2 border-slate-200 border-dashed bg-slate-50 flex flex-col justify-center items-center hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer min-h-[350px] group"
            >
              <div className="size-14 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 group-hover:text-primary transition-all">
                <span className="material-symbols-outlined text-3xl">add</span>
              </div>
              <p className="font-bold text-slate-500 group-hover:text-primary">Create New Category</p>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
