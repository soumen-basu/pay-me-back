import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { PageLayout } from './layout/PageLayout';
import { api } from '../services/api';

// Supported currencies
const CURRENCIES = [
  { symbol: '₹', name: 'Indian Rupee', code: 'INR' },
  { symbol: '$', name: 'US Dollar', code: 'USD' },
  { symbol: '€', name: 'Euro', code: 'EUR' },
  { symbol: '£', name: 'British Pound', code: 'GBP' },
  { symbol: '¥', name: 'Japanese Yen', code: 'JPY' },
  { symbol: 'A$', name: 'Australian Dollar', code: 'AUD' },
  { symbol: 'C$', name: 'Canadian Dollar', code: 'CAD' },
];

interface Contact {
  id: number;
  user_id: number;
  contact_email: string;
  label: string | null;
  created_at: string;
}

const MAX_CONTACTS = 5;

export function Profile() {
  const { user, refreshToken } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferred_currency || '₹');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await api.get<Contact[]>('/api/v1/users/me/contacts');
      setContacts(data);
    } catch {
      // silently fail for contacts fetch
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, string> = {};
      if (displayName !== (user.display_name || '')) payload.display_name = displayName;
      if (preferredCurrency !== (user.preferred_currency || '₹')) payload.preferred_currency = preferredCurrency;

      if (Object.keys(payload).length === 0) {
        setMessage({ text: 'No changes to save', type: 'success' });
        setIsSaving(false);
        return;
      }

      await api.patch<any>('/api/v1/users/me', payload);

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      await refreshToken();
    } catch (err: unknown) {
      const errorMsg = (err as any).detail || 'Update failed';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setPasswordMessage({ text: 'Please enter a new password', type: 'error' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    try {
      await api.patch<any>('/api/v1/users/me', { password: newPassword });

      setPasswordMessage({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      await refreshToken();
    } catch (err: unknown) {
      const errorMsg = (err as any).detail || 'Update failed';
      setPasswordMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactEmail) return;

    setIsAddingContact(true);
    setContactMessage(null);

    try {
      await api.post('/api/v1/users/me/contacts', { contact_email: newContactEmail });
      setNewContactEmail('');
      await fetchContacts();
    } catch (err: unknown) {
      const errorMsg = (err as any).detail || 'Failed to add contact';
      setContactMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await api.delete(`/api/v1/users/me/contacts/${contactId}`);
      await fetchContacts();
    } catch (err: unknown) {
      const errorMsg = (err as any).detail || 'Failed to delete contact';
      setContactMessage({ text: errorMsg, type: 'error' });
    }
  };

  const getInitials = (email: string): string => {
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const profileSidebarItems = [
    { label: 'Home', icon: 'home', path: '/dashboard' },
    { label: 'Debts', icon: 'receipt_long', path: '/debts' },
    { label: 'Payments', icon: 'payments', path: '/payments' },
    { label: 'Me', icon: 'person', path: '/me' },
  ];

  return (
    <PageLayout variant="app" sidebarItems={profileSidebarItems}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Me</h1>
          <p className="text-slate-500 mt-1">Personalize your app experience and security.</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left column: Profile, Preferences, Security */}
          <div className="lg:col-span-3 space-y-6">

            {/* Profile Card */}
            <div className="bg-yellow-50/60 rounded-2xl p-6 border border-yellow-100">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-yellow-500 text-xl">sentiment_satisfied</span>
                <h2 className="text-lg font-bold text-slate-900">Profile</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="profile-display-name">
                    Display Name
                  </label>
                  <input
                    id="profile-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder={user.email}
                  />
                  <p className="text-xs text-yellow-600 mt-1.5 italic">Defaults to your email if not set.</p>
                </div>
              </div>
            </div>

            {/* Preferences Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-orange-400 text-xl">settings</span>
                <h2 className="text-lg font-bold text-slate-900">Preferences</h2>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="profile-currency">
                  Preferred Currency
                </label>
                <div className="relative">
                  <select
                    id="profile-currency"
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value)}
                    className="w-full bg-yellow-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.symbol}>
                        {c.symbol} - {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xl">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-primary text-xl">shield</span>
                <h2 className="text-lg font-bold text-slate-900">Security</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="profile-current-password">
                    Current Password
                  </label>
                  <input
                    id="profile-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="profile-new-password">
                    New Password
                  </label>
                  <input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  className="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>

                {passwordMessage && (
                  <div className={`px-4 py-3 rounded-xl text-sm font-medium text-center ${
                    passwordMessage.type === 'error'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-green-50 text-green-700 border border-green-100'
                  }`}>
                    {passwordMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Frequent Contacts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-purple-500 text-xl">group</span>
                <h2 className="text-lg font-bold text-slate-900">Frequent Contacts</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Quickly add friends you split bills with often (max {MAX_CONTACTS}).
              </p>

              {/* Contact List */}
              <div className="space-y-3 mb-6">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                  >
                    <div className="size-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {getInitials(contact.contact_email)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                      {contact.contact_email}
                    </span>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove contact"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}

                {contacts.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4 italic">No contacts added yet.</p>
                )}
              </div>

              {/* Slots remaining */}
              {contacts.length < MAX_CONTACTS && (
                <p className="text-xs text-slate-400 text-center mb-4">
                  {MAX_CONTACTS - contacts.length} slot{MAX_CONTACTS - contacts.length !== 1 ? 's' : ''} remaining
                </p>
              )}

              {/* Add Contact */}
              {contacts.length < MAX_CONTACTS && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Add New Contact</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="friend@email.com"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddContact();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddContact}
                      disabled={isAddingContact || !newContactEmail}
                      className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              )}

              {contactMessage && (
                <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium text-center ${
                  contactMessage.type === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-green-50 text-green-700 border border-green-100'
                }`}>
                  {contactMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="material-symbols-outlined text-sm text-primary">info</span>
            Changes are saved automatically to your account.
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setDisplayName(user.display_name || '');
                setPreferredCurrency(user.preferred_currency || '₹');
                setMessage(null);
              }}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-8 py-3 rounded-xl bg-primary text-slate-900 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Profile save message */}
        {message && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium text-center max-w-md mx-auto ${
            message.type === 'error'
              ? 'bg-red-50 text-red-600 border border-red-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
