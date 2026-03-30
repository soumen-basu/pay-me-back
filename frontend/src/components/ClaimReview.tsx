import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';
import { fetchCurrencies, formatAmount, groupByCurrency, formatCurrencyTotals } from '../utils/currency';
import type { CurrencyInfo } from '../utils/currency';

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
  description: string;
  date: string | null;
  category_name: string | null;
  currency_code: string;
  claim_id: string | null;
  status: string;
}

interface Comment {
  id: string;
  text: string;
  user_id: number;
  expense_id: string | null;
  claim_id: string | null;
  created_at: string;
}

export function ClaimReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);

  // Communication / Comments State
  // Communication / Comments State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityComments, setEntityComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  const fetchClaimData = useCallback(async () => {
    try {
      const claims = await api.get<Claim[]>('/api/v1/claims/?role=all');
      const foundClaim = claims.find(c => c.id === id);
      
      if (!foundClaim) {
        throw new Error("Claim not found or access denied.");
      }
      setClaim(foundClaim);

      const allExpenses = await api.get<Expense[]>('/api/v1/expenses/?role=all');
      setExpenses(allExpenses.filter(e => e.claim_id === id));
    } catch (err) {
      console.error(err);
      // If access denied or error, go back to a safe place
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchClaimData();
    fetchCurrencies().then(setCurrencies);
  }, [fetchClaimData]);

  // Fetch comments when an entity is selected
  useEffect(() => {
    if (!selectedEntityId) {
      setEntityComments([]);
      return;
    }
    const fetchComments = async () => {
      setCommentsLoading(true);
      try {
        const url = selectedEntityId === id 
            ? `/api/v1/claims/${id}/comments` 
            : `/api/v1/expenses/${selectedEntityId}/comments`;
        const data = await api.get<Comment[]>(url);
        setEntityComments(data);
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [selectedEntityId, id]);

  const handleSendComment = async () => {
    if (!selectedEntityId || !newComment.trim()) return;
    try {
      const url = selectedEntityId === id 
          ? `/api/v1/claims/${id}/comments` 
          : `/api/v1/expenses/${selectedEntityId}/comments`;
      const addedComment = await api.post<Comment>(url, {
        text: newComment.trim()
      });
      setEntityComments(prev => [...prev, addedComment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleUpdateExpenseStatus = async (expenseId: string, status: 'APPROVED' | 'REJECTED') => {
    // Only update local state, don't hit API yet
    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status } : e));
  };

  const handleFinalizeClaim = async () => {
    try {
      const expense_statuses: Record<string, string> = {};
      expenses.forEach(e => {
        expense_statuses[e.id] = e.status;
      });

      let final_status = 'APPROVED';
      if (expenses.every(e => e.status === 'REJECTED')) {
        final_status = 'REJECTED';
      } else if (expenses.some(e => e.status === 'REJECTED')) {
        final_status = 'PARTIALLY_APPROVED';
      }

      await api.post(`/api/v1/claims/${id}/review`, {
        expense_statuses,
        claim_status: final_status,
        comment: comment.trim() || undefined
      });
      navigate('/approvals');
    } catch (err) {
      console.error('Failed to submit claim review', err);
      alert('Failed to submit claim review. Ensure all items are reviewed.');
    }
  };

  const handleDetachExpense = async (expenseId: string) => {
    if (!window.confirm("Are you sure you want to detach this rejected expense and return it to your open expenses?")) return;
    try {
      await api.post(`/api/v1/claims/${id}/expenses/${expenseId}/detach`);
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    } catch (err) {
      console.error('Failed to detach expense', err);
      alert('Failed to detach expense.');
    }
  };

  const handleDeleteClaim = async () => {
    if (!window.confirm("Are you sure you want to delete this claim? Any detached expenses will return to your open pool.")) return;
    try {
      await api.delete(`/api/v1/claims/${id}`);
      navigate('/claims');
    } catch (err) {
      console.error('Failed to delete claim', err);
      alert('Failed to delete claim. Only claims with no expenses or entirely rejected expenses can be deleted.');
    }
  };

  // Use the shared currency utility — no local formatCurrency needed

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

  const isSubmitter = claim.submitter_id === user?.id;
  const totalAmountByCurrency = groupByCurrency(expenses);
  const allReviewed = expenses.every(e => e.status !== 'OPEN');
  
  const canDeleteClaim = isSubmitter && claim.status !== 'CLOSED' && (expenses.length === 0 || expenses.every(e => e.status === 'REJECTED'));
  
  return (
    <PageLayout variant="app">
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto px-8 py-8 items-start mb-24">
        
        {/* LEFT PANE: Claim Overview and Line Items */}
        <div className="flex-1 w-full lg:w-2/3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>

          <div 
            className={`bg-white rounded-3xl p-8 border shadow-sm mb-8 relative transition-all cursor-pointer ${
              selectedEntityId === id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100 hover:border-slate-300'
            }`}
            onClick={() => { if (id) setSelectedEntityId(id); }}
          >
            {canDeleteClaim && (
              <button 
                onClick={handleDeleteClaim}
                className="absolute top-6 right-6 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                title="Delete Claim"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Claim
              </button>
            )}

            <div className={`flex justify-between items-start mb-6 ${canDeleteClaim ? 'pr-32' : ''}`}>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{claim.title}</h1>
                <p className="text-slate-500 mt-2 text-sm">{claim.description || 'No description provided.'}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Claimed</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrencyTotals(totalAmountByCurrency, currencies)}</p>
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
            Claim Items
          </h2>

          <div className="space-y-4">
            {expenses.length === 0 ? (
               <p className="text-slate-500 italic">No expenses attached to this claim.</p>
            ) : expenses.map(e => {
              const isActive = selectedEntityId === e.id;
              
              return (
              <div 
                key={e.id} 
                className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${
                  isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100 hover:border-slate-300'
                }`}
                onClick={() => setSelectedEntityId(e.id)}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{e.description}</h3>
                      <p className="text-sm text-slate-500">{e.category_name || 'Uncategorized'} • {formatDate(e.date)}</p>
                    </div>
                    <p className="font-black text-xl text-slate-900">{formatAmount(e.amount, e.currency_code || 'INR', currencies)}</p>
                  </div>
                  
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
                {claim.status === 'OPEN' && !isSubmitter && (
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6" onClick={ev => ev.stopPropagation()}>
                    <button 
                      onClick={() => handleUpdateExpenseStatus(e.id, 'APPROVED')}
                      className={`size-10 rounded-full flex items-center justify-center transition-all ${
                        e.status === 'APPROVED' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 cursor-pointer'
                      }`}
                      title="Approve"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">check</span>
                    </button>

                    <button 
                      onClick={() => handleUpdateExpenseStatus(e.id, 'REJECTED')}
                      className={`size-10 rounded-full flex items-center justify-center transition-all ${
                        e.status === 'REJECTED' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer'
                      }`}
                      title="Reject"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                    </button>
                  </div>
                )}
                
                {/* Submitter Actions */}
                {isSubmitter && claim.status !== 'CLOSED' && e.status === 'REJECTED' && (
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6" onClick={ev => ev.stopPropagation()}>
                    <button 
                      onClick={() => handleDetachExpense(e.id)}
                      className="text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 hover:border-red-200"
                      title="Detach Expense"
                    >
                      <span className="material-symbols-outlined text-[16px]">link_off</span>
                      Detach
                    </button>
                  </div>
                )}

              </div>
            )})}
          </div>
        </div>

        {/* RIGHT PANE: Communication chat */}
        <div className={`w-full lg:w-1/3 sticky top-8 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden ${
          !isSubmitter && claim.status === 'OPEN' ? 'h-[calc(100vh-280px)] min-h-[400px]' : 'h-[calc(100vh-120px)] min-h-[500px]'
        }`}>
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Communication</h2>
            <p className="text-xs text-slate-500 mt-1">
              {selectedEntityId ? `Chatting about ${selectedEntityId === id ? 'overarching claim' : 'selected item'}` : 'Select the claim or an item to view messages'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-4">
            {!selectedEntityId ? (
              <div className="m-auto text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                <p className="text-sm">Click the claim card or an expense item to start chatting</p>
              </div>
            ) : commentsLoading ? (
               <div className="m-auto text-center text-primary animate-pulse">
                 Loading messages...
               </div>
            ) : entityComments.length === 0 ? (
               <div className="m-auto text-center text-slate-400">
                 <p className="text-sm">No messages yet.</p>
                 <p className="text-xs mt-1">Send a message to ask for receipts or clarification.</p>
               </div>
            ) : (
              entityComments.map(c => {
                const isMine = c.user_id === user?.id;
                return (
                  <div key={c.id} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end' : 'self-start'}`}>
                    <span className={`text-[10px] font-bold uppercase text-slate-400 mb-1 ${isMine ? 'text-right' : 'text-left'}`}>
                      {isMine ? 'You' : `User #${c.user_id}`} • {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className={`px-4 py-3 rounded-2xl text-sm ${
                      isMine 
                      ? 'bg-primary/20 text-slate-900 rounded-tr-sm' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    }`}>
                      {c.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex bg-slate-50 rounded-full border border-slate-200 overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input 
                type="text"
                placeholder={selectedEntityId ? "Type a message..." : "Select an item first"}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                disabled={!selectedEntityId}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment() }}
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none disabled:opacity-50"
              />
              <button 
                onClick={handleSendComment}
                disabled={!selectedEntityId || !newComment.trim()}
                className="flex items-center justify-center px-4 text-primary hover:text-slate-900 disabled:opacity-30 disabled:hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">send</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Global Action / Finalize Bar */}
      {claim.status === 'OPEN' && !isSubmitter && (
        <div className="fixed bottom-0 left-0 md:left-60 right-0 p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col items-stretch z-10 gap-4">
          <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
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
              Submit Review
            </button>
          </div>
          
          {allReviewed && (
            <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2">
              <input
                type="text"
                placeholder="Optional note or reason for the submitter regarding the final decision..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm font-medium px-4 py-3 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
