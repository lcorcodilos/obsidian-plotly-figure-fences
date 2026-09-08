# Plotly Figure Fences

Obsidian plugin that renders ` ```plotly ` fences (a figure JSON filename + alt
text) as themed, interactive Plotly charts in reading view and live preview.
See [OBSIDIAN_PLUGIN.md](OBSIDIAN_PLUGIN.md) for the full design brief.

Status: Phase 4 (theming) — figures are themed to the current Obsidian theme:
a palette built from Obsidian's CSS variables (§4) fills in whatever the
figure's own layout leaves unset, and re-themes live on theme change without
a reload. The author's own layout values always win.

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
8. Toggle light/dark (Settings → Appearance) while a figure is open — it
   should restyle immediately, no reload needed.
9. Open `Theming - author colour wins.md` and toggle the theme again — the
   line must stay the exact red from its JSON while background, gridlines,
   and font still follow the theme. Compare against `Valid figure.md`, whose
   trace has no explicit colour and should visibly change with the theme's
   accent colour.
10. Try a community theme if you have one installed — colours should still
    make sense (not fall back to Plotly's own default palette).
