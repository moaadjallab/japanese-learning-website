/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  ASSETS: Fetcher;
  // DB?: D1Database; // V2 — see db/schema.sql
}

declare namespace App {
  interface Locals extends Runtime {}
}
