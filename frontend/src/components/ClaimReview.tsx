import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';

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
  merchant: string | null;
  date: string | null;
  category: string | null;
  description: string | null;
  claim_id: string | null;
  status: string;
}

export function ClaimReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaimData = useCallback(async () => {
    try {
      const claims = await api.get<Claim[]>('/api/v1/claims?role=all');
      const foundClaim = claims.find(c => c.id === id);
      
      if (!foundClaim) {
        throw new Error("Claim not found or access denied.");
      }
      setClaim(foundClaim);

      const allExpenses = await api.get<Expense[]>('/api/v1/expenses');
      setExpenses(allExpenses.filter(e => e.claim_id === id));
    } catch (err) {
      console.error(err);
      navigate('/approvals');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchClaimData();
  }, [fetchClaimData]);

  const handleUpdateExpenseStatus = async (expenseId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/api/v1/claims/${id}/expenses/${expenseId}/status?status=${status}`, {});
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status } : e));
    } catch (err) {
      console.error('Failed to update expense status', err);
    }
  };

  const handleFinalizeClaim = async () => {
    try {
      await api.post(`/api/v1/claims/${id}/close`, {});
      navigate('/approvals');
    } catch (err) {
      console.error('Failed to close claim', err);
      alert('Cannot close claim yet. Ensure all expenses are either approved or rejected.');
    }
  };

  const formatCurrency = (amount: number): string => {
    const symbol = user?.preferred_currency || '₹';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <PageLayout variant="app">
        <div className="flex justify-center items-center min-h-[50vh]">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        </div>
      </PageLayout>
    );
  }

  if (!claim) return null;

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const allReviewed = expenses.every(e => e.status !== 'OPEN');
  
  return (
    <PageLayout variant="app">
      <div className="max-w-4xl mx-auto px-8 py-8">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-primary transition-colors cursor-pointer">
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{claim.title}</h1>
              <p className="text-slate-500 mt-2 text-sm">{claim.description || 'No description provided.'}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Claimed</p>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalAmount)}</p>
              <span className="inline-block bg-yellow-100 text-yellow-700 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-widest mt-2">{claim.status}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mt-8 border-t border-slate-100 pt-6">
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-widest mb-1">Submitted By</p>
              <p className="font-bold text-slate-900">User #{claim.submitter_id}</p>
            </div>
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-widest mb-1">Date Submitted</p>
              <p className="font-bold text-slate-900">{formatDate(claim.created_at)}</p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          Line Items ({expenses.length})
        </h2>

        <div className="space-y-4 mb-10">
          {expenses.length === 0 ? (
             <p className="text-slate-500 italic">No expenses attached to this claim.</p>
          ) : expenses.map(e => (
            <div key={e.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{e.merchant || 'Unknown Merchant'}</h3>
                    <p className="text-sm text-slate-500">{e.category || 'Uncategorized'} • {formatDate(e.date)}</p>
                  </div>
                  <p className="font-black text-xl text-slate-900">{formatCurrency(e.amount)}</p>
                </div>
                {e.description && <p className="text-sm text-slate-400 mt-2">{e.description}</p>}
                
                {/* Status Indicator */}
                <div className="mt-4">
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    e.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    e.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {e.status || 'Needs Review'}
                  </span>
                </div>
              </div>

              {/* Approver Actions */}
              {claim.status === 'OPEN' && (
                <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  <button 
                    onClick={() => handleUpdateExpenseStatus(e.id, 'APPROVED')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                      e.status === 'APPROVED' ? 'opacity-50 cursor-not-allowed bg-green-50 text-green-600 border border-green-200' : 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span> Approve
                  </button>

                  <button 
                    onClick={() => handleUpdateExpenseStatus(e.id, 'REJECTED')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                      e.status === 'REJECTED' ? 'opacity-50 cursor-not-allowed bg-red-50 text-red-600 border border-red-200' : 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Global Action */}
        {claim.status === 'OPEN' && (
          <div className="fixed bottom-0 left-0 md:left-60 right-0 p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-between items-center z-10">
            <div>
              <p className="font-bold text-slate-900 tracking-tight">Finalize Claim</p>
              <p className="text-sm text-slate-500">Ensure all line items are approved or rejected.</p>
            </div>
            <button 
              onClick={handleFinalizeClaim}
              disabled={!allReviewed}
              className={`px-8 py-3 rounded-xl font-black transition-all ${
                allReviewed 
                ? 'bg-primary text-slate-900 hover:scale-105 shadow-lg shadow-primary/30 cursor-pointer' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Close & Determine Final Status
            </button>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
