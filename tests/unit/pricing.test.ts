import { describe, expect, it } from 'vitest';
import { formatPrice, PRICE_PLACEHOLDER } from '@/lib/pricing';

describe('pricing', () => {
  it('never invents a price', () => {
    expect(formatPrice({ price: null, currency: 'USD' }, 'en')).toBe(PRICE_PLACEHOLDER.en);
    expect(formatPrice({ price: null, currency: 'USD' }, 'ar')).toBe('XX$');
  });
  it('formats real prices with Latin digits', () => {
    expect(formatPrice({ price: 19, currency: 'USD' }, 'en')).toBe('$19');
    expect(formatPrice({ price: 19.5, currency: 'USD' }, 'en')).toBe('$19.50');
    expect(formatPrice({ price: 19, currency: 'USD' }, 'ar')).toMatch(/19/);
  });
});
