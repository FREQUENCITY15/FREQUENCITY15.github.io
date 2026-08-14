# FREQUENCITY static site

Static GitHub Pages edition of Thom's browser tools.

## Included routes

- `/` — FREQUENCITY collection hub
- `/tool-shelf/` — The Tool Shelf
- `/prompt-budget-builder/` — Prompt Budget Builder
- `/recap-invocation-lab/` — RECAP Invocation Lab
- `/between-seams-pocket-console/` — Between the Seams Pocket Console

All four tools run entirely in the browser. Local drafts and settings remain in
the visitor's browser storage. The preservation checkpoint, evidence files,
screenshots, recordings, and continuity notes are intentionally excluded.

## Build

```bash
npm install
npm run build
```

The deployable GitHub Pages files are written to `dist/`. The `CNAME` and
`.nojekyll` files are included automatically.
