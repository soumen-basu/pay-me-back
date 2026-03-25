import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';
import { useExpenseSelection } from '../contexts/ExpenseSelectionContext';

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

// ── Steps ──
const STEPS = [
  { label: 'Claim Details', icon: 'edit_note' },
  { label: 'Select Expenses', icon: 'checklist' },
  { label: 'Review & Submit', icon: 'send' },
];

const CATEGORY_ICONS: Record<string, string> = {
  education: 'school', food: 'restaurant', travel: 'flight',
  medical: 'medical_services', office: 'business_center', subs: 'subscriptions',
  shopping: 'shopping_bag', other: 'category',
};

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[(name || '').toLowerCase().trim()] || 'category';
}

export function ClaimBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedExpenseIds, clearSelection } = useExpenseSelection();

  // ── Wizard state ──
  const [step, setStep] = useState(0);

  // ── Step 1: Claim details ──
  const [claimTitle, setClaimTitle] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [approverEmail, setApproverEmail] = useState('');

  // ── Step 2: Expense selection ──
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedExpenseIds));
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  // ── Step 3: Submission ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await api.get<Expense[]>('/api/v1/expenses');
      // Only show OPEN expenses not already assigned to a claim
      setExpenses(data.filter((e) => e.status === 'OPEN' && !e.claim_id));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ── Derived data ──
  const categories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category_name));
    return ['All', ...Array.from(cats).sort()];
  }, [expenses]);

  const filteredExpenses = useMemo(
    () => activeCategory === 'All' ? expenses : expenses.filter((e) => e.category_name === activeCategory),
    [expenses, activeCategory]
  );

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => selectedIds.has(e.id)),
    [expenses, selectedIds]
  );

  const totalAmount = useMemo(
    () => selectedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [selectedExpenses]
  );

  const formatCurrency = (amount: number): string => {
    const symbol = user?.preferred_currency || '₹';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── Selection ──
  const toggleExpense = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ── Progress ──
  const progressPercent = Math.round(((step + 1) / STEPS.length) * 100);

  // ── Validation ──
  const canProceed = () => {
    if (step === 0) return claimTitle.trim().length > 0;
    if (step === 1) return selectedIds.size > 0;
    return true;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create the claim
      const claim = await api.post<any>('/api/v1/claims', {
        title: claimTitle,
        description: claimDescription || undefined,
        approver_emails: approverEmail.trim() ? [approverEmail.trim()] : undefined,
      });

      // 2. Assign selected expenses to the claim using the new bulk API
      await api.post(`/api/v1/claims/${claim.id}/expenses`, { 
        expense_ids: Array.from(selectedIds) 
      });

      // Clear the global selection state
      clearSelection();

      // Navigate to dashboard on success
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <PageLayout variant="app">
      <div className="flex flex-1 overflow-hidden h-full">
        {/* ── Left Pane ── */}
        <div className="w-3/5 flex flex-col overflow-y-auto custom-scrollbar p-8 border-r border-primary/10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 text-sm">
            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">
              Dashboard
            </button>
            <span className="material-symbols-outlined text-xs text-slate-300">chevron_right</span>
            <span className="text-slate-900 font-semibold">New Claim</span>
          </nav>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Build Your Claim</h1>
            <p className="text-slate-500">
              {step === 0 && 'Start by giving your claim a name and approver.'}
              {step === 1 && 'Select expenses from your history to include in this submission.'}
              {step === 2 && 'Review your claim details and submit.'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="bg-primary/5 rounded-2xl p-6 mb-8 border border-primary/10">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">
                  Step {step + 1} of {STEPS.length}
                </p>
                <p className="text-xl font-bold text-slate-800">{STEPS[step].label}</p>
              </div>
              <p className="text-2xl font-black text-primary">{progressPercent}%</p>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(19,236,120,0.5)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ── Step Content ── */}
          {step === 0 && (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="claim-title">
                  Claim Title *
                </label>
                <input
                  id="claim-title"
                  type="text"
                  value={claimTitle}
                  onChange={(e) => setClaimTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. Medical Expenses — October 2023"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="claim-desc">
                  Description
                </label>
                <textarea
                  id="claim-desc"
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-24 resize-y"
                  placeholder="Optional notes about this claim..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="claim-approver">
                  Approver Email
                </label>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-xl mr-3">person_search</span>
                  <input
                    id="claim-approver"
                    type="email"
                    value={approverEmail}
                    onChange={(e) => setApproverEmail(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                    placeholder="approver@example.com"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">This person will review and approve your expenses.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              {/* Category tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6 self-start flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Expense cards */}
              <div className="space-y-4">
                {filteredExpenses.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                    <p className="text-slate-400 font-medium mt-2">No open expenses found in this category.</p>
                  </div>
                )}

                {filteredExpenses.map((exp) => {
                  const isSelected = selectedIds.has(exp.id);
                  return (
                    <div
                      key={exp.id}
                      onClick={() => toggleExpense(exp.id)}
                      className={`group relative flex items-center gap-4 p-5 bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        isSelected ? 'border-primary' : 'border-transparent hover:border-primary/30'
                      }`}
                    >
                      <div className={`flex items-center justify-center size-12 rounded-xl ${
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <span className="material-symbols-outlined">{getCategoryIcon(exp.category_name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{exp.description}</h4>
                        <p className="text-sm text-slate-500">
                          {exp.category_name} • {formatDate(exp.date)}
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-bold text-slate-900">{formatCurrency(exp.amount)}</p>
                        <p className="text-xs text-slate-400">Reimbursable</p>
                      </div>
                      {/* Checkbox */}
                      <div className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-primary text-slate-900'
                          : 'border-2 border-slate-200'
                      }`}>
                        {isSelected && <span className="material-symbols-outlined text-sm font-black">check</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-lg">
              {/* Review summary */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <span className="material-symbols-outlined">fact_check</span>
                  <h3 className="text-lg font-bold text-slate-900">Review Your Claim</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{claimTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approver</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{approverEmail || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedIds.size} items</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>

                {claimDescription && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</p>
                    <p className="text-sm text-slate-600 mt-1">{claimDescription}</p>
                  </div>
                )}
              </div>

              {/* Receipt dropzone */}
              <div className="border-2 border-dashed border-primary/30 rounded-3xl p-8 text-center bg-primary/5 group hover:bg-primary/10 transition-colors cursor-pointer">
                <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">add_a_photo</span>
                </div>
                <p className="text-slate-900 font-bold mb-1">Add receipts</p>
                <p className="text-slate-500 text-xs">Drag and drop or click to upload supporting documents</p>
              </div>

              {submitError && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium text-center bg-red-50 text-red-600 border border-red-100">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => step === 0 ? navigate('/dashboard') : setStep(step - 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              {step === 0 ? 'Cancel' : 'Back'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-slate-900 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-40 cursor-pointer"
              >
                Next Step
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-slate-900 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-60 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">send</span>
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            )}
          </div>
        </div>

        {/* ── Right Pane: Summary ── */}
        <div className="w-2/5 bg-slate-50 p-8 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-primary/10 p-6 border-b border-primary/20 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Claim Summary</h3>
              <span className="px-3 py-1 bg-primary text-slate-900 text-xs font-black rounded-full">DRAFT</span>
            </div>

            <div className="p-6">
              {/* Total */}
              <div className="flex flex-col items-center mb-8">
                <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4">
                  <span className="material-symbols-outlined text-4xl">payments</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Total Reimbursement</p>
                <h2 className="text-4xl font-black text-slate-900 mt-1">{formatCurrency(totalAmount)}</h2>
              </div>

              {/* Included Items */}
              <div className="space-y-6">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Included Items ({selectedExpenses.length})
                  </h5>

                  {selectedExpenses.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4 italic">No expenses selected yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedExpenses.map((exp) => (
                        <div key={exp.id} className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <span className="material-symbols-outlined text-sm">{getCategoryIcon(exp.category_name)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                              <p className="text-xs text-slate-500">{formatDate(exp.date)} • {exp.category_name}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold">{formatCurrency(exp.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Claim info */}
                {claimTitle && (
                  <div className="pt-6 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Claim Details</h5>
                    <p className="text-sm font-bold text-slate-800">{claimTitle}</p>
                    {approverEmail && (
                      <p className="text-xs text-slate-500 mt-1">Approver: {approverEmail}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
