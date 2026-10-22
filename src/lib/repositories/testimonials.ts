/** Testimonial repository. Only real, consented reviews may replace the placeholders. */
import { getCollection } from 'astro:content';
import type { Testimonial } from '@/lib/domain/types';

export const getTestimonials = async (): Promise<Testimonial[]> =>
  (await getCollection('testimonials'))
    .map((entry) => ({ id: entry.id, ...entry.data }))
    .sort((a, b) => a.order - b.order);
