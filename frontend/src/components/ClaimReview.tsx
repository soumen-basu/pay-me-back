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

  // Communication / Comments State
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [expenseComments, setExpenseComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

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

  // Fetch comments when an expense is selected
  useEffect(() => {
    if (!selectedExpenseId) {
      setExpenseComments([]);
      return;
    }
    const fetchComments = async () => {
      setCommentsLoading(true);
      try {
        const data = await api.get<Comment[]>(`/api/v1/expenses/${selectedExpenseId}/comments`);
        setExpenseComments(data);
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [selectedExpenseId]);

  const handleSendComment = async () => {
    if (!selectedExpenseId || !newComment.trim()) return;
    try {
      const addedComment = await api.post<Comment>(`/api/v1/expenses/${selectedExpenseId}/comments`, {
        text: newComment.trim()
      });
      setExpenseComments(prev => [...prev, addedComment]);
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
        final_status,
        comment: comment.trim() || undefined
      });
      navigate('/approvals');
    } catch (err) {
      console.error('Failed to submit claim review', err);
      alert('Failed to submit claim review. Ensure all items are reviewed.');
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
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto px-8 py-8 items-start mb-24">
        
        {/* LEFT PANE: Claim Overview and Line Items */}
        <div className="flex-1 w-full lg:w-2/3">
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
            Claim Items
          </h2>

          <div className="space-y-4">
            {expenses.length === 0 ? (
               <p className="text-slate-500 italic">No expenses attached to this claim.</p>
            ) : expenses.map(e => {
              const isActive = selectedExpenseId === e.id;
              
              return (
              <div 
                key={e.id} 
                className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${
                  isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100 hover:border-slate-300'
                }`}
                onClick={() => setSelectedExpenseId(e.id)}
              >
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
              </div>
            )})}
          </div>
        </div>

        {/* RIGHT PANE: Communication chat */}
        <div className="w-full lg:w-1/3 sticky top-8 flex flex-col h-[600px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Communication</h2>
            <p className="text-xs text-slate-500 mt-1">
              {selectedExpenseId ? 'Chatting about selected item' : 'Select an item to view messages'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-4">
            {!selectedExpenseId ? (
              <div className="m-auto text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                <p className="text-sm">Click an expense item to start chatting</p>
              </div>
            ) : commentsLoading ? (
               <div className="m-auto text-center text-primary animate-pulse">
                 Loading messages...
               </div>
            ) : expenseComments.length === 0 ? (
               <div className="m-auto text-center text-slate-400">
                 <p className="text-sm">No messages yet.</p>
                 <p className="text-xs mt-1">Send a message to ask for receipts or clarification.</p>
               </div>
            ) : (
              expenseComments.map(c => {
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
                placeholder={selectedExpenseId ? "Type a message..." : "Select an item first"}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                disabled={!selectedExpenseId}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment() }}
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none disabled:opacity-50"
              />
              <button 
                onClick={handleSendComment}
                disabled={!selectedExpenseId || !newComment.trim()}
                className="flex items-center justify-center px-4 text-primary hover:text-slate-900 disabled:opacity-30 disabled:hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">send</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Global Action / Finalize Bar */}
      {claim.status === 'OPEN' && (
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
