import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Category {
  id: string;
  name: string;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCategories?: Category[];
  initialExpense?: any;
}

export function AddExpenseModal({ onClose, onSuccess, initialCategories, initialExpense }: AddExpenseModalProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [description, setDescription] = useState(initialExpense?.description || '');
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() || '');
  const [date, setDate] = useState(initialExpense?.date || new Date().toISOString().split('T')[0]);
  const [categoryName, setCategoryName] = useState(initialExpense?.category_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCategories) {
      api.get<Category[]>('/api/v1/categories')
        .then(data => setCategories(data))
        .catch(console.error);
    }
  }, [initialCategories]);

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
      const payload = {
        description,
        amount: parseFloat(amount),
        date,
        category_name: categoryName,
      };

      if (initialExpense) {
        await api.patch(`/api/v1/expenses/${initialExpense.id}`, payload);
      } else {
        await api.post('/api/v1/expenses', payload);
      }
      
      // Fire a custom event so other components (like ExpensesPage) can refresh automatically
      window.dispatchEvent(new Event('expense_added'));
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <button onClick={onClose} className="size-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium appearance-none cursor-pointer"
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
              {isSubmitting ? 'Saving...' : (initialExpense ? 'Update Expense' : 'Save Expense')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
