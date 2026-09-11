# Plotly Figure Fences

An Obsidian plugin that renders a `plotly` fenced code block as a themed,
interactive [Plotly](https://plotly.com/javascript/) chart, in both reading
view and live preview. It exists to close one gap: a vault that publishes to
a website built around this fence format, where Obsidian itself has no idea
what the referenced figure looks like until the site is built.

See [OBSIDIAN_PLUGIN.md](OBSIDIAN_PLUGIN.md) for the full design brief this
plugin was built from — it's the authoritative source for the fence format,
the theming approach, and the decisions behind them.

## The fence format

````markdown
```plotly
figure: coverage_by_quarter.json
alt: Detection coverage by quarter, rising from 40% to 78%.
```
````

- `figure` — the **basename** of a Plotly `fig.to_json()` file, resolved
  against the whole vault (the same "shortest path when possible" rule
  Obsidian uses for its own links).
- `alt` — a required text alternative. A figure with no `alt` is treated as
  an authoring error and shown as an in-place notice, because the site this
  format is shared with fails its build without one.

This format is a fixed contract shared with a separate website; the plugin
does not extend it.

## What it does

- Parses the fence, resolves `figure` by basename anywhere in the vault, and
  reads/parses the referenced JSON.
- Draws the figure with Plotly (the full `plotly.js-dist` distribution,
  vendored into the plugin — every trace type, including 3D, maps, and
  WebGL, matching what the website supports).
- Sizes the figure to fit it: a figure whose layout asks for `height: 900`
  (subplots usually do) gets 900px, not a fixed box, and a drag handle in the
  bottom-right corner lets you resize any figure by hand. See "Figure size"
  below.
- Builds a colour palette from Obsidian's own CSS variables so every figure
  matches the active theme (light, dark, or a community theme), and
  re-themes live figures immediately on theme change — no reload. A figure's
  own layout always wins over the palette; the palette only fills gaps.
- Surfaces every failure in place — malformed YAML, a missing `figure` or
  `alt` key, a file that can't be found, invalid JSON, or a Plotly draw
  error — as a readable notice, never a silent blank gap.

## Figure size

The fence has no size key and isn't going to get one — it's a fixed contract
shared with the website. Height comes from the figure itself, or from you:

1. **A size you dragged this figure to**, if any.
2. **The figure's own `layout.height`** (or its template's). A `make_subplots`
   figure normally carries a height large enough for its panels; that height is
   honoured as-is.
3. **360px**, otherwise.

A figure's own `layout.width` is deliberately *ignored*: a figure exported at
1100px wide should still fit the note's column rather than overhang it. Width
follows the note until you drag it, and the explicit width/height are lifted off
the layout onto the container so Plotly autosizes into it (an explicit size
makes Plotly ignore its container entirely, which is what pinned every figure to
one box before).

**Dragging:** hover a figure and a handle appears in the bottom-right corner.
Dragging it down/up changes the height and leaves the width fluid; dragging it
sideways also pins the width, and dragging back to the column width releases it.
The size is remembered per figure per note, in the plugin's own data — never in
the note, and never in the figure JSON (the plugin does not write to the vault's
content).

**Width past the text column:** dragging wider than Obsidian's *readable line
length* works, but the figure then overhangs to the right rather than
re-centring. For a genuinely wide figure, turn off Settings → Appearance →
Readable line length (or use that note's "Readable line length" toggle) and the
figure fills the window.

## What it doesn't do

Not a chart editor or figure generator, and it never writes to the vault.
Figures are produced elsewhere (Python notebooks) and committed as JSON. It
also has no knowledge of the website's build or deployment beyond honouring
the fence format itself.

## Install

This is a personal-use plugin, not published to the community plugin
directory.

**Manual:**

1. `npm install && npm run build` to produce `main.js`.
2. Copy `main.js`, `manifest.json`, and `styles.css` into
   `<vault>/.obsidian/plugins/plotly-figure-fences/`.
3. Reload Obsidian (or toggle the plugin off/on) and enable it under
   Settings → Community plugins.

**Via [BRAT](https://github.com/TfTHacker/obsidian42-brat):**

1. Install BRAT in the other vault (it's on the community plugin directory).
2. Command palette → "BRAT: Add a beta plugin for updates" → enter
   `lcorcodilos/obsidian-plotly-figure-fences`.
3. BRAT installs the latest GitHub release and checks it for updates. See
   "Releasing a new version" below for how a release gets published.

## Development

```
npm install
npm run dev          # esbuild watch mode
npm run build         # typecheck + production build -> main.js
npm run typecheck     # tsc --noEmit
npm run test          # unit tests for the pure parsing/merge/theme logic
```

The Obsidian API is kept behind a thin boundary (`src/vault.ts` for file
lookup/reading, `src/colorProbe.ts` for resolving CSS variables); everything
else — fence parsing (`src/parse.ts`), figure JSON parsing (`src/figure.ts`),
the theme palette (`src/theme.ts`), and the layout merge (`src/mergeLayout.ts`)
— is plain, unit-tested logic with no Obsidian or DOM dependency.

## Releasing a new version

`main.js` is a build artifact and isn't committed — `.github/workflows/release.yml`
builds it and publishes a GitHub release (with `main.js`, `manifest.json`, and
`styles.css` attached) whenever a tag is pushed, which is what BRAT installs
and watches for updates.

1. Bump the version in `manifest.json` and `package.json`, and add an entry
   to `versions.json` mapping it to the required Obsidian version.
2. Commit and push that to `origin` (the tag below only triggers CI once the
   commit it points at actually exists on GitHub).
3. Tag the commit with the bare version number (no `v` prefix — it must
   match `manifest.json` exactly, e.g. `0.2.0`) and push the tag:
   `git tag 0.2.0 && git push origin 0.2.0`.
4. CI builds, runs the tests, checks the tag matches `manifest.json`, and
   publishes a release with the three files attached. BRAT picks it up from
   there.

**If that CI run fails:** fix the problem and commit it, then move the tag to
the new commit — re-running the old job re-uses the workflow file *as it was
at the tag's original commit*, so it'll fail the same way again otherwise:

```
git tag -d 0.2.0 && git push origin :refs/tags/0.2.0
git tag 0.2.0 && git push origin 0.2.0
```

## Manual verification (`test-vault/`)

Rendering, theming, live-preview behaviour, and mobile can't be exercised
from a terminal — Obsidian is a GUI app with no headless mode. `test-vault/`
exists so this takes two minutes rather than requiring you to build a vault
from scratch.

`test-vault/.obsidian/plugins/plotly-figure-fences/` symlinks `manifest.json`,
`main.js`, and `styles.css` back to the repo root, so a build is picked up
without copying files — **but Obsidian does not hot-reload a changed
`main.js`.** After rebuilding, toggle the plugin off/on in Settings →
Community plugins, or reload the app, to pick up the new build.

1. `npm run build` (or leave `npm run dev` running).
2. Open `test-vault/` as a vault in Obsidian. If prompted about community
   plugins / restricted mode, allow them — `community-plugins.json` already
   lists this plugin as enabled.
3. Open `Valid figure.md` — should draw the sample line chart.
4. Open each `Error - *.md` note — should show a readable in-place error
   notice matching its filename, not a blank gap or silent console log.
5. Open `Below the fold.md`, scroll past the filler text — the figure should
   draw once it comes into view (not stay blank; the zero-width-container
   case).
6. Open `Multiple figures.md` and scroll past all five figures, back up, and
   repeat a few times — nothing should leak, duplicate, or slow the app down.
7. Toggle light/dark (Settings → Appearance) while a figure is open — it
   should restyle immediately, no reload needed.
8. Open `Theming - author colour wins.md` and toggle the theme again — the
   line must stay the exact red from its JSON while background, gridlines,
   and font still follow the theme. Compare against `Valid figure.md`, whose
   trace has no explicit colour and should visibly change with the theme's
   accent colour.
9. Try a community theme if you have one installed — colours should still
   make sense (not fall back to Plotly's own default palette, which would
   mean the CSS-variable probe failed for that theme).
10. Hover over a drawn figure — the mode bar (home/zoom/camera/download)
    should appear with no background box and theme-coloured icons, not
    Plotly's default dark-grey box; move away and it should hide again.
11. Open `3D figure (full bundle).md` — a `scatter3d` trace should draw and be
    orbitable with the mouse. This only works with the full bundle; it's the
    one case that exercises why the plugin moved off cartesian-only.
12. Open `Large subplots.md` — all four panels should have room (the figure's
    own `height: 900`, not a 360px box), the figure should be the width of the
    note rather than its own 1100px, and every panel's gridlines should follow
    the theme, not just the top-left one.
13. In that same note, hover the figure, drag the bottom-right handle down and
    sideways — the chart should reflow live while dragging. Scroll away and
    back, then close and reopen the note: the size should persist. Drag the
    width back to the column edge and the figure should go fluid again
    (resize the window afterwards to confirm it follows).

`isDesktopOnly` is `false` (Plotly should work in Obsidian's mobile webview),
but this has not been tested on mobile.
