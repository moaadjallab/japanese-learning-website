/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  ASSETS: Fetcher;
  /** Cloudflare D1 database (accounts & sessions). See db/migrations/. */
  DB: D1Database;
}

declare namespace App {
  interface Locals extends Runtime {
    /** Current session, set by src/middleware.ts on on-demand routes (null when signed out). */
    session: import('@/lib/auth/types').Session | null;
  }
}
