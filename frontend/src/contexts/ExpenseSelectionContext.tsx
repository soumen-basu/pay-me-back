import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ExpenseSelectionContextType {
  selectedExpenseIds: string[];
  toggleExpense: (id: string) => void;
  clearSelection: () => void;
}

const ExpenseSelectionContext = createContext<ExpenseSelectionContextType | undefined>(undefined);

export function ExpenseSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  const toggleExpense = (id: string) => {
    setSelectedExpenseIds(prev => 
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedExpenseIds([]);
  };

  return (
    <ExpenseSelectionContext.Provider value={{ selectedExpenseIds, toggleExpense, clearSelection }}>
      {children}
    </ExpenseSelectionContext.Provider>
  );
}

export function useExpenseSelection() {
  const context = useContext(ExpenseSelectionContext);
  if (context === undefined) {
    throw new Error('useExpenseSelection must be used within an ExpenseSelectionProvider');
  }
  return context;
}
