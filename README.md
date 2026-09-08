# Plotly Figure Fences

Obsidian plugin that renders ` ```plotly ` fences (a figure JSON filename + alt
text) as themed, interactive Plotly charts in reading view and live preview.
See [OBSIDIAN_PLUGIN.md](OBSIDIAN_PLUGIN.md) for the full design brief.

Status: Phase 1 (skeleton) — the fence is parsed and shown as plain text.
Charting comes in a later phase.

## Build

```
npm install
npm run build       # typecheck + production build -> main.js
npm run dev          # esbuild watch mode
```

## Manual verification (`test-vault/`)

`test-vault/.obsidian/plugins/plotly-figure-fences/` symlinks `manifest.json`,
`main.js`, and `styles.css` back to the repo root, so a build is picked up
immediately without copying files.

1. `npm run build` (or leave `npm run dev` running).
2. Open `test-vault/` as a vault in Obsidian.
3. If prompted about community plugins / restricted mode, allow them — the
   vault's `community-plugins.json` already lists this plugin as enabled.
4. Open `Valid figure.md` and switch to reading view.
