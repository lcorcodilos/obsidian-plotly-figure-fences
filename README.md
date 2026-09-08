# Plotly Figure Fences

Obsidian plugin that renders ` ```plotly ` fences (a figure JSON filename + alt
text) as themed, interactive Plotly charts in reading view and live preview.
See [OBSIDIAN_PLUGIN.md](OBSIDIAN_PLUGIN.md) for the full design brief.

Status: Phase 3 (rendering) — figures actually draw, via the bundled
`plotly-cartesian` distribution (§6), lazy-loaded on first use. Handles
lifecycle/cleanup and the zero-width-container case (§5). No theming yet
(Phase 4) — figures render in whatever colours their own JSON specifies.

## Build

```
npm install
npm run build       # typecheck + production build -> main.js
npm run dev          # esbuild watch mode
npm run test         # unit tests for the pure parsing logic
```

## Manual verification (`test-vault/`)

`test-vault/.obsidian/plugins/plotly-figure-fences/` symlinks `manifest.json`,
`main.js`, and `styles.css` back to the repo root, so a build is picked up
immediately without copying files. **Obsidian does not hot-reload a changed
main.js** — after rebuilding, toggle the plugin off/on in Settings → Community
plugins, or reload the app, to pick up the new build.

1. `npm run build` (or leave `npm run dev` running).
2. Open `test-vault/` as a vault in Obsidian.
3. If prompted about community plugins / restricted mode, allow them — the
   vault's `community-plugins.json` already lists this plugin as enabled.
4. Open `Valid figure.md` — should draw the sample line chart.
5. Open each `Error - *.md` note — should show a readable in-place error
   notice matching its filename, not a blank gap or silent console log.
6. Open `Below the fold.md`, scroll past the filler text — the figure should
   draw once it comes into view (not stay blank; this is the zero-width fix).
7. Open `Multiple figures.md` and scroll past all five figures, back up, and
   repeat a few times — nothing should leak, duplicate, or slow the app down.
