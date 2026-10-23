/**
 * Pure access & progress rules for the student space (no I/O, unit-tested).
 */
import { PLAN_RANK, type Lesson, type PlanId } from '@/lib/domain/types';

/** A course is accessible when the student's active plan is one of the course's plans. */
export const canAccessCourse = (plan: PlanId | null, coursePlans: readonly PlanId[]): boolean =>
  plan !== null && coursePlans.includes(plan);

/** Live classes require at least `minPlan` (premium or private). */
export const canJoinLive = (plan: PlanId | null, minPlan: PlanId): boolean =>
  plan !== null && PLAN_RANK[plan] >= PLAN_RANK[minPlan];

/** Cheapest plan that unlocks a course (for "upgrade" prompts). */
export const cheapestPlanFor = (coursePlans: readonly PlanId[]): PlanId | null =>
  [...coursePlans].sort((a, b) => PLAN_RANK[a] - PLAN_RANK[b])[0] ?? null;

export const progressPercent = (completed: number, total: number): number =>
  total <= 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

/** First lesson not yet completed (or the first lesson when all are done). */
export const nextLesson = (lessons: readonly Lesson[], completed: ReadonlySet<string>): Lesson | undefined =>
  lessons.find((lesson) => !completed.has(lesson.id)) ?? lessons[0];

/** Neighbouring lessons for previous / next navigation. */
export const lessonNeighbours = (lessons: readonly Lesson[], lessonId: string) => {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return {
    previous: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
    position: index + 1,
  };
};
