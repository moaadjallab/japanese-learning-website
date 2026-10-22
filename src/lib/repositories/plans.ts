/** Subscription plan repository (content collection today, D1/payment provider later). */
import { getCollection } from 'astro:content';
import { isPlanId, type Plan } from '@/lib/domain/types';

export const getPlans = async (): Promise<Plan[]> =>
  (await getCollection('plans'))
    .filter((entry) => isPlanId(entry.id))
    .map((entry) => ({ id: entry.id as Plan['id'], ...entry.data }))
    .sort((a, b) => a.order - b.order);

export const getPlan = async (id: string): Promise<Plan | undefined> =>
  isPlanId(id) ? (await getPlans()).find((plan) => plan.id === id) : undefined;
