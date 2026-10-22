/**
 * Price formatting. Prices are never invented: while a plan's price is `null`
 * we show the agreed placeholder ("$XX" in English, "XX$" in Arabic).
 */
import type { Locale } from '@/i18n/config';
import { LOCALE_META } from '@/i18n/config';
import type { Plan } from '@/lib/domain/types';

export const PRICE_PLACEHOLDER: Record<Locale, string> = { en: '$XX', ar: 'XX$' };

export const isPriceSet = (plan: Pick<Plan, 'price'>): plan is { price: number } => plan.price !== null;

export const formatPrice = (plan: Pick<Plan, 'price' | 'currency'>, locale: Locale): string => {
  if (plan.price === null) return PRICE_PLACEHOLDER[locale];
  return new Intl.NumberFormat(LOCALE_META[locale].intl, {
    style: 'currency',
    currency: plan.currency,
    // Show cents only when the price has them.
    minimumFractionDigits: Number.isInteger(plan.price) ? 0 : 2,
    numberingSystem: 'latn',
  }).format(plan.price);
};
