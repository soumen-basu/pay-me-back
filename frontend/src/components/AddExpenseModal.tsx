import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from './AuthProvider';
import { useTierFeatures } from '../contexts/TierContext';
import { fetchCurrencies, getSymbol } from '../utils/currency';
import type { CurrencyInfo } from '../utils/currency';

interface Category {
  id: string;
  name: string;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCategories?: Category[];
  initialExpense?: any;
  /** Pass loaded expenses so we can derive "last currency used". */
  expenses?: { currency_code?: string }[];
}

export function AddExpenseModal({ onClose, onSuccess, initialCategories, initialExpense, expenses }: AddExpenseModalProps) {
  const { user } = useAuth();
  const { features } = useTierFeatures();
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
  const [activeIndex, setActiveIndex] = useState(-1);

  // Currency state
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    if (initialExpense?.currency_code) return initialExpense.currency_code;
    // Derive last-used currency from loaded expenses
    if (expenses && expenses.length > 0) {
      const last = expenses[expenses.length - 1];
      if (last.currency_code) return last.currency_code;
    }
    return user?.preferred_currency || 'INR';
  });
  const isClaimedExpense = !!(initialExpense?.claim_id);

  // Description autocomplete state
  const [pastDescriptions, setPastDescriptions] = useState<string[]>([]);
  const [isDescDropdownOpen, setIsDescDropdownOpen] = useState(false);
  const [descActiveIndex, setDescActiveIndex] = useState(-1);
  const descInputRef = useRef<HTMLInputElement>(null);

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
      api.get<Category[]>('/api/v1/categories/')
        .then(data => {
          setCategories(data);
          if (!initialExpense && data && data.length > 0) {
            setCategoryName((prev: string) => prev || data[0].name);
          }
        })
        .catch(err => console.error("Failed to load categories", err));
    }
  }, [initialCategories, initialExpense]);

  // Fetch currencies and past descriptions on mount
  useEffect(() => {
    fetchCurrencies().then(setCurrencies);
    api.get<string[]>('/api/v1/expenses/descriptions')
      .then(setPastDescriptions)
      .catch(() => { /* silently fail */ });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !categoryName) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const trimmedCategory = categoryName.trim();
      const categoryExists = categories.some(
        (c) => (c.name || '').toLowerCase() === trimmedCategory.toLowerCase()
      );
      
      if (!categoryExists && trimmedCategory) {
        console.log(`Creating new category: ${trimmedCategory}`);
        try {
          const newCat = await api.post<Category>('/api/v1/categories/', { name: trimmedCategory });
          if (newCat && newCat.name) {
             setCategories(prev => [...prev, newCat]);
          }
        } catch (catErr) {
          console.error("Failed to auto-create category", catErr);
        }
      }

      const payload: Record<string, any> = {
        description,
        amount: parseFloat(amount),
        date,
        category_name: trimmedCategory,
        currency_code: currencyCode,
      };

      console.log("Submitting expense payload:", payload);

      if (initialExpense) {
        // Don't send currency_code if the expense is claimed (backend will reject)
        if (isClaimedExpense) {
          delete payload.currency_code;
        }
        await api.patch(`/api/v1/expenses/${initialExpense.id}`, payload);
      } else {
        await api.post('/api/v1/expenses/', payload);
      }
      
      window.dispatchEvent(new Event('expense_added'));
      onSuccess();
    } catch (err: any) {
      console.error("Expense operation failed:", err);
      const errorMsg = err?.detail || (typeof err === 'string' ? err : 'Failed to save expense');
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Category dropdown logic ──────────────────────────────────────────
  const filteredCategories = categories.filter(c => (c.name || '').toLowerCase().includes((categoryName || '').toLowerCase()));

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (!isCategoryDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsCategoryDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredCategories.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filteredCategories.length) {
        e.preventDefault();
        setCategoryName(filteredCategories[activeIndex].name);
        setIsCategoryDropdownOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsCategoryDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  // ── Description autocomplete logic ───────────────────────────────────
  const filteredDescriptions = pastDescriptions.filter(
    d => d.toLowerCase().includes((description || '').toLowerCase()) && d.toLowerCase() !== (description || '').toLowerCase()
  );

  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (!isDescDropdownOpen || filteredDescriptions.length === 0) {
      if (e.key === 'ArrowDown' && filteredDescriptions.length > 0) {
        setIsDescDropdownOpen(true);
        setDescActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDescActiveIndex(prev => (prev < filteredDescriptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDescActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (descActiveIndex >= 0 && descActiveIndex < filteredDescriptions.length) {
        e.preventDefault();
        setDescription(filteredDescriptions[descActiveIndex]);
        setIsDescDropdownOpen(false);
        setDescActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsDescDropdownOpen(false);
      setDescActiveIndex(-1);
    }
  };

  const currentSymbol = getSymbol(currencyCode, currencies);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full h-full md:h-auto md:max-w-lg animate-in zoom-in-95 duration-200 relative border border-slate-100 overflow-y-auto custom-scrollbar">
        <div className="p-6 md:p-10 w-full flex flex-col">
          <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 size-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer z-10">
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="mb-8 pr-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
        </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Description with autocomplete */}
            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">What did you buy?</label>
              <input
                ref={descInputRef}
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                placeholder="e.g. Starbucks Latte"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDescDropdownOpen(true);
                  setDescActiveIndex(-1);
                }}
                onKeyDown={handleDescKeyDown}
                onFocus={() => {
                  if (description && filteredDescriptions.length > 0) setIsDescDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsDescDropdownOpen(false), 200)}
                autoFocus
              />
              {isDescDropdownOpen && filteredDescriptions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                  {filteredDescriptions.slice(0, 8).map((desc: string, index: number) => (
                    <div
                      key={desc}
                      className={`px-5 py-3 cursor-pointer text-slate-700 font-medium transition-colors border-b border-slate-50 last:border-b-0 ${descActiveIndex === index ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDescription(desc);
                        setIsDescDropdownOpen(false);
                        setDescActiveIndex(-1);
                      }}
                      onMouseEnter={() => setDescActiveIndex(index)}
                    >
                      {desc}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amount + Currency + Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-3">
              {/* Currency selector */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                  Cur.
                  {!features?.capabilities.can_use_multiple_currencies && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">Pro</span>
                  )}
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  disabled={isClaimedExpense || !features?.capabilities.can_use_multiple_currencies}
                  className="h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3.5 text-slate-900 font-bold text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isClaimedExpense ? 'Currency cannot be changed on claimed expenses' : (!features?.capabilities.can_use_multiple_currencies ? 'Upgrade to Pro to use multiple currencies' : 'Select currency')}
                >
                  {currencies.map((c: CurrencyInfo) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
                {!features?.capabilities.can_use_multiple_currencies && (
                   <div className="mt-1.5 text-xs text-amber-600 font-medium px-1">Upgrade to unlock currencies</div>
                )}
              </div>
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">How much?</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currentSymbol}</span>
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
              {/* Date */}
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

            {/* Category */}
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
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleCategoryKeyDown}
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
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredCategories.map((cat: Category, index: number) => (
                    <div
                      key={cat.id}
                      className={`px-5 py-3 cursor-pointer text-slate-700 font-medium transition-colors border-b border-slate-50 last:border-b-0 ${activeIndex === index ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        setCategoryName(cat.name); 
                        setIsCategoryDropdownOpen(false); 
                        setActiveIndex(-1);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      {cat.name}
                    </div>
                  ))}
                  {filteredCategories.length === 0 && (
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
    </div>,
    document.body
  );
}
