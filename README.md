# Plotly Figure Fences

Obsidian plugin that renders ` ```plotly ` fences (a figure JSON filename + alt
text) as themed, interactive Plotly charts in reading view and live preview.
See [OBSIDIAN_PLUGIN.md](OBSIDIAN_PLUGIN.md) for the full design brief.

Status: Phase 2 (parsing and resolution) — the fence is parsed, the figure
JSON is resolved by basename and read from the vault, and every error case in
the plan's §5 table is surfaced in place. Charting comes in Phase 3.

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
immediately without copying files.

1. `npm run build` (or leave `npm run dev` running).
2. Open `test-vault/` as a vault in Obsidian.
3. If prompted about community plugins / restricted mode, allow them — the
   vault's `community-plugins.json` already lists this plugin as enabled.
4. Open `Valid figure.md` — should report the parsed file and trace count.
5. Open each `Error - *.md` note — should show a readable in-place error
   notice matching its filename, not a blank gap or silent console log.
