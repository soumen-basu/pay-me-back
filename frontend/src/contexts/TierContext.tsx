import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from '../components/AuthProvider';

interface TierCapabilities {
  can_use_multiple_currencies: boolean;
  can_create_multi_currency_claims: boolean;
  has_receipt_extraction: boolean;
}

interface Quota {
  limit: number;
  current_usage: number;
}

interface TierQuotas {
  max_expenses_per_month: Quota;
  max_claims_per_month: Quota;
  max_receipt_size_mb: Quota;
  max_receipts_per_expense: Quota;
}

interface TierFeatures {
  tier: string;
  capabilities: TierCapabilities;
  quotas: TierQuotas;
}

interface TierContextType {
  features: TierFeatures | null;
  loading: boolean;
  refreshFeatures: () => Promise<void>;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export function TierProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [features, setFeatures] = useState<TierFeatures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const data = await api.get<TierFeatures>('/api/v1/users/me/tier-features');
      setFeatures(data);
    } catch (err) {
      console.error('Failed to fetch tier features', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have an authenticated user
    if (user && token) {
      fetchFeatures();
    } else {
      setFeatures(null);
      setLoading(false);
    }
  }, [user, token]);

  return (
    <TierContext.Provider value={{ features, loading, refreshFeatures: fetchFeatures }}>
      {children}
    </TierContext.Provider>
  );
}

export const useTierFeatures = () => {
  const context = useContext(TierContext);
  if (context === undefined) {
    throw new Error('useTierFeatures must be used within a TierProvider');
  }
  return context;
};
