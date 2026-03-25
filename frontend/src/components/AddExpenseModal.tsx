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
  const [categoryName, setCategoryName] = useState(
    initialExpense?.category_name || (initialCategories && initialCategories.length > 0 ? initialCategories[0].name : '')
  );
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!initialCategories) {
      api.get<Category[]>('/api/v1/categories')
        .then(data => {
          setCategories(data);
          if (!initialExpense && data.length > 0) {
            setCategoryName((prev: string) => prev || data[0].name);
          }
        })
        .catch(console.error);
    }
  }, [initialCategories, initialExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !categoryName) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1a. Automatically create the category for the user if it's new
      const trimmedCategory = categoryName.trim();
      const categoryExists = categories.some(
        (c) => c.name.toLowerCase() === trimmedCategory.toLowerCase()
      );
      
      if (!categoryExists && trimmedCategory) {
        try {
          await api.post('/api/v1/categories', { name: trimmedCategory });
        } catch (catErr) {
          console.error("Failed to auto-create category", catErr);
        }
      }

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative border border-slate-100">
        <div className="p-8 sm:p-10 w-full flex flex-col" style={{ padding: '32px' }}>
          <button onClick={onClose} className="absolute top-6 right-6 size-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer z-10">
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="mb-8 pr-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
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

            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Category</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setIsCategoryDropdownOpen(true);
                  }}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                  placeholder="Type or select a category"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined transition-transform duration-200" style={{ transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                </button>
              </div>

              {isCategoryDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto custom-scrollbar overflow-hidden">
                  {categories.filter(c => c.name.toLowerCase().includes(categoryName.toLowerCase())).map(cat => (
                    <div
                      key={cat.id}
                      className="px-5 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium transition-colors border-b border-slate-50 last:border-b-0"
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        setCategoryName(cat.name); 
                        setIsCategoryDropdownOpen(false); 
                      }}
                    >
                      {cat.name}
                    </div>
                  ))}
                  {categories.filter(c => c.name.toLowerCase().includes(categoryName.toLowerCase())).length === 0 && (
                     <div className="px-5 py-3 text-slate-400 text-sm font-medium italic bg-slate-50/50">
                       {categoryName ? `Press Save to permanently create "${categoryName}"` : "No categories found."}
                     </div>
                  )}
                </div>
              )}
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
