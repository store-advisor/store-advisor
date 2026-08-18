import { cn } from '@/lib/utils';

describe('cn()', () => {
  it('returns an empty string when called with no args', () => {
    expect(cn()).toBe('');
  });

  it('passes a single class through', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles conditional objects', () => {
    expect(cn({ active: true, hidden: false })).toBe('active');
  });

  it('deduplicates conflicting Tailwind utilities (tailwind-merge)', () => {
    // tailwind-merge removes the earlier conflicting class
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('merges array syntax', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});
