# Screenshots

Responsive / RTL visual QA output (not committed, ~40 MB).

```bash
pnpm build
pnpm screenshots
```

Writes `screenshots/<en|ar>/<page>-<width>.png` for widths 360, 390, 768, 1024, 1280 and 1536 px,
and fails if any page scrolls horizontally. Pages: home, courses, course detail, pricing, contact, checkout.
