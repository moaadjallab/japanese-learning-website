/** FAQ repository. */
import { getCollection } from 'astro:content';
import { FAQ_CATEGORY_IDS, type Faq, type FaqCategoryId } from '@/lib/domain/types';

export const getFaqs = async (): Promise<Faq[]> =>
  (await getCollection('faqs')).map((entry) => ({ id: entry.id, ...entry.data }));

/** FAQs grouped by category, in the order defined by FAQ_CATEGORY_IDS. */
export const getFaqsByCategory = async (): Promise<{ category: FaqCategoryId; items: Faq[] }[]> => {
  const all = await getFaqs();
  return FAQ_CATEGORY_IDS.map((category) => ({
    category,
    items: all.filter((f) => f.category === category).sort((a, b) => a.order - b.order),
  }));
};

/** The questions shown in the home-page FAQ preview (SPEC section 8), in order. */
export const getHomeFaqs = async (): Promise<Faq[]> =>
  (await getFaqs())
    .filter((f) => f.homeOrder !== undefined)
    .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0));
