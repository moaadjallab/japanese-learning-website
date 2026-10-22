import type { en } from './en';

/** Recursively widen string literals so other locales only need matching *shape*. */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T;

/** The dictionary shape is defined by the English source of truth. */
export type Dictionary = Widen<typeof en>;
