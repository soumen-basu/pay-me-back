/**
 * Shared currency utilities.
 *
 * Single frontend source-of-truth for formatting amounts and aggregating
 * multi-currency totals.  The canonical currency list is fetched once from
 * GET /api/v1/currencies/ and cached in-memory.
 */

import { api } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;      // "INR"
  symbol: string;    // "₹"
  name: string;      // "Indian Rupee"
  decimals: number;  // 2  (0 for JPY, KRW)
}

export interface HasAmountAndCurrency {
  amount: number;
  currency_code: string;
}

// ── Currency list cache ──────────────────────────────────────────────────

let _cachedCurrencies: CurrencyInfo[] | null = null;

/**
 * Fetch and cache the supported currencies from the backend.
 * Subsequent calls return the cached value.
 */
export async function fetchCurrencies(): Promise<CurrencyInfo[]> {
  if (_cachedCurrencies) return _cachedCurrencies;
  try {
    const data = await api.get<CurrencyInfo[]>('/api/v1/currencies/');
    _cachedCurrencies = data;
    return data;
  } catch {
    // Fallback to a minimal default so the app doesn't break
    return [{ code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 }];
  }
}

/** Clear the cache (useful after login/logout). */
export function clearCurrencyCache(): void {
  _cachedCurrencies = null;
}

// ── Lookup helpers ───────────────────────────────────────────────────────

/**
 * Get the CurrencyInfo for a code from a pre-fetched list.
 * Returns a sensible fallback if the code isn't found.
 */
export function getCurrencyInfo(
  code: string,
  currencies: CurrencyInfo[],
): CurrencyInfo {
  return (
    currencies.find((c) => c.code === code) ?? {
      code,
      symbol: code,
      name: code,
      decimals: 2,
    }
  );
}

/** Shorthand to get just the symbol. */
export function getSymbol(code: string, currencies: CurrencyInfo[]): string {
  return getCurrencyInfo(code, currencies).symbol;
}

// ── Formatting ───────────────────────────────────────────────────────────

/**
 * Format a numeric amount with its currency symbol.
 *
 * Examples:
 *   formatAmount(1234.5, 'INR', currencies) → "₹1,234.50"
 *   formatAmount(1000,   'JPY', currencies) → "¥1,000"
 */
export function formatAmount(
  amount: number,
  currencyCode: string,
  currencies: CurrencyInfo[],
): string {
  const info = getCurrencyInfo(currencyCode, currencies);
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });
  return `${info.symbol}${formatted}`;
}

// ── Aggregation ──────────────────────────────────────────────────────────

/**
 * Group an array of items by currency_code and sum the amounts.
 *
 * Returns a plain object keyed by currency code:
 *   { INR: 4500, USD: 120 }
 */
export function groupByCurrency(
  items: HasAmountAndCurrency[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const code = item.currency_code ?? 'INR';
    totals[code] = (totals[code] ?? 0) + item.amount;
  }
  return totals;
}

/**
 * Format a multi-currency totals object as a human-readable string.
 *
 * Example:
 *   "₹4,500.00 + $120.00"
 */
export function formatCurrencyTotals(
  totals: Record<string, number>,
  currencies: CurrencyInfo[],
): string {
  const entries = Object.entries(totals);
  if (entries.length === 0) return formatAmount(0, 'INR', currencies);
  return entries
    .map(([code, amount]) => formatAmount(amount, code, currencies))
    .join(' + ');
}
