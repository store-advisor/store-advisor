/**
 * Display formatting.
 *
 * Money is formatted here and nowhere else. The whole project rests on every
 * dollar figure tracing back to a database row, so the one place a number
 * changes shape should be obvious and shared - not scattered through
 * components where two of them could round differently.
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMoneyExact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** "ad_spend_on_oos" reads badly on a card. */
export function humanizeCheckId(checkId: string): string {
  const known: Record<string, string> = {
    ad_spend_on_oos: 'Ad spend on out-of-stock product',
  };
  return known[checkId] ?? checkId.replace(/_/g, ' ');
}

/** Turns an evidence key into a label without needing a per-check mapping. */
export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/, 'ID');
}
