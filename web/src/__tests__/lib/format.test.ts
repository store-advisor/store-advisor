import {
  formatMoney,
  formatMoneyExact,
  humanizeCheckId,
  humanizeKey,
} from '@/lib/format';

describe('format', () => {
  it('rounds the headline figure the way the demo card shows it', () => {
    // The check computes 283.5; the card says $284. Both are correct, and
    // this is the one place that rounding happens.
    expect(formatMoney(283.5)).toBe('$284');
  });

  it('keeps cents when the exact figure matters', () => {
    expect(formatMoneyExact(243)).toBe('$243.00');
    expect(formatMoneyExact(40.5)).toBe('$40.50');
  });

  it('gives check ids a readable label', () => {
    expect(humanizeCheckId('ad_spend_on_oos')).toBe(
      'Ad spend on out-of-stock product',
    );
  });

  it('falls back readably for a check it has never seen', () => {
    // A new check must not need a frontend change to be legible.
    expect(humanizeCheckId('dead_stock')).toBe('dead stock');
  });

  it('turns evidence keys into labels', () => {
    expect(humanizeKey('spend_since_stockout')).toBe('Spend Since Stockout');
  });
});
