# Obsidian plugin: Plotly figure fences

## 0. How to read this document

**This is the complete brief. You have no other context.**

You are building an Obsidian plugin in a fresh, empty repository. This document
is written for an agent session that cannot see, and must not assume access to,
the static-site generator this plugin is designed to match. Everything you need
to know about that generator is restated here.

Two consequences:

- **Do not go looking for the site's source.** It is a separate private repo. If
  something seems under-specified, it is worth asking about — not something to hunt for on disk.
- **The fence format in §2 is a contract, not a suggestion.** The same text is
  parsed by a published website. Extending or "improving" the syntax means notes
  that render here and break there. If you think the format is wrong, say so and
  stop; do not quietly widen it.

---

## 1. What this is and why it exists

The user writes a blog and digital garden in Obsidian. The vault is the
source for a website built by a custom Python + Jinja static-site generator.

Interactive Plotly figures are a first-class content type in that vault. They
are authored as a **fenced code block naming a committed figure JSON file**
(§2). The website turns that fence into a real interactive chart.

**Obsidian does not.** In Obsidian the author sees a fenced block of YAML — the
filename and a description — with no idea what the figure looks like. To check a
plot they have to build and serve the site.

**This plugin closes that gap.** It renders the identical fence, from the
identical JSON, in Obsidian's reading view and live preview, themed to the
current Obsidian theme.

### What success looks like

An author writing a note sees the actual chart inline while writing, and what
they see matches what publishes. Nothing about the vault's contents changes to
accommodate the plugin — it reads exactly what is already there.

### Explicit non-goals

- **Not a chart editor.** No GUI for building or modifying figures. Figures are
  produced in Python notebooks and committed as JSON.
- **Not a figure generator.** The plugin never writes to the vault.
- **Not a Plotly playground.** It renders one specific fence format, nothing else.
- **Does not need to know the website exists** beyond honouring the contract in
  §2. It has no knowledge of URLs, builds, or deployment.
- **Does not validate anything the website needs but the vault cannot see.** One
  concrete case: some figures are expected to have a companion static image
  beside the JSON, used when a post is exported to a platform that runs no
  JavaScript. Whether a given note needs one depends on how the site classifies
  it, which is not knowable from inside the vault. Leave it alone; the site's
  own export checks for it.

---

## 2. The fence contract

This is the format already in use across the vault. **It is fixed.**

````markdown
```plotly
figure: coverage_by_quarter.json
alt: Detection coverage by quarter, rising from 40% to 78%.
```
````

- The info string is exactly **`plotly`**.
- The body is **YAML**, with exactly two recognised keys.
- **`figure`** — the *basename* of a JSON file stored in the vault. Required.
- **`alt`** — a text alternative describing the figure. Required.

### Resolution rule

`figure` is a **basename**, resolved against the whole vault — not a path
relative to the note. This mirrors Obsidian's own "shortest path when possible"
link behaviour, and it means the same figure can be referenced from notes in
different folders without rewriting the reference.

In practice the files live in the vault's attachments folder, but do not hardcode
that. Resolve by name.

### Why `alt` is required

The website **fails its build** if a figure has no `alt`. A chart with no text
alternative is invisible to anyone using a screen reader, and it is also the text
used when the figure is exported to other platforms that cannot run JavaScript.

The plugin should therefore treat a missing `alt` as an authoring error worth
surfacing — see §5 for how. This is arguably the plugin's second-most useful
behaviour after rendering: it catches the mistake at writing time instead of at
build time.

---

## 3. The figure JSON contract

The referenced file is the output of Plotly's `fig.to_json()`:

```json
{
  "data": [ { "type": "scatter", "mode": "lines+markers", "x": [1,2,3,4], "y": [10,15,13,17] } ],
  "layout": { "title": {"text": "Example"}, "xaxis": {"title": {"text": "x"}}, "yaxis": {"title": {"text": "y"}} }
}
```

- `data` — array of Plotly traces. Pass through untouched.
- `layout` — Plotly layout object. **Merged with a theme palette; see §4.**

Both keys may be missing or empty; treat them as `[]` and `{}` respectively
rather than erroring.

Use the sample above as a fixture — it is enough to exercise the whole path.

### Authoring conventions you should know about

The author is expected to strip two things from committed figures, because both
freeze colours that should follow the reader's theme:

- **`layout.template`** — carries an entire background and font palette from
  whatever theme was active in the notebook.
- **Auto-assigned trace colours** — `px.line()` and friends write their first
  colorway entry (`#636efa`, `#EF553B`, …) into `line.color`. That is not a
  deliberate choice, but nothing downstream can tell the difference.

**The plugin does not enforce or strip these.** It renders what it is given. They
are noted only so you understand why §4's merge precedence is what it is, and so
that if a figure stubbornly renders in the wrong colours you know where to look
before assuming a bug in your code.

---

## 4. Theming

**Requirement: a figure must look like it belongs in the current Obsidian theme,
and must follow theme changes without a reload.**

Obsidian has light and dark modes and a large ecosystem of community themes. A
figure that renders in fixed colours will look broken in most of them.

### Read colours from Obsidian's CSS variables

Build the palette from Obsidian's own theme variables so any theme is followed
for free. The useful ones:

| Variable | Use |
|---|---|
| `--text-normal` | Font colour |
| `--text-muted` | Secondary series colour |
| `--text-faint` | Tertiary series colour |
| `--interactive-accent` | Primary series colour |
| `--background-modifier-border` | Gridlines, zerolines, axis lines |
| `--font-text` / `--font-monospace` | Font family |

Backgrounds should be **transparent** (`rgba(0,0,0,0)` for both `paper_bgcolor`
and `plot_bgcolor`) so the note's own background shows through and the figure
sits flush in the page.

### Known pitfall: reading the variables

**Do not read theme colours with
`getComputedStyle(el).getPropertyValue("--text-normal")`.**

CSS custom properties are *substitution-only*. That call returns the property's
literal text, not a resolved colour. If a theme defines a variable in terms of
another function — `light-dark(...)`, `color-mix(...)`, a chain of `var(...)` —
you get that text back verbatim. Plotly cannot parse it, and **fails silently**:
it falls back to its own default palette without raising, so the figure quietly
ignores the theme and looks like a bug in the wrong place.

This exact failure was hit and diagnosed in the website implementation. Resolve
through a probe element instead, which forces the browser to compute a real
colour:

```js
const probe = document.createElement("span");
probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
document.body.appendChild(probe);
const SENTINEL = "rgb(1, 2, 3)";

function themeColor(name, fallback) {
  probe.style.color = SENTINEL;          // detect "var did not resolve"
  probe.style.color = `var(${name})`;
  const value = getComputedStyle(probe).color;
  return !value || value === SENTINEL ? fallback : value;
}
```

Always pass a sensible fallback. Themes are free to omit variables.

### Merge precedence: the author wins

Build a theme palette, then let the figure's own `layout` override it, deeply.
The committed figure is the author's intent; the palette only fills gaps.

```js
// Only fill in what the committed layout did not set. Recurse into plain
// objects so { xaxis: { title } } keeps the theme's xaxis.gridcolor.
function mergeLayout(base, override) {
  const out = { ...override };
  for (const key of Object.keys(base)) {
    const b = base[key];
    const o = override[key];
    if (o === undefined) out[key] = b;
    else if (b && o && typeof b === "object" && !Array.isArray(b)) {
      out[key] = mergeLayout(b, o);
    }
  }
  return out;
}
```

Arrays are replaced wholesale, never merged element-wise.

**Match this behaviour.** The website uses exactly this algorithm, and the point
of the plugin is that preview matches publication.

### Re-theme on theme change

Obsidian fires a workspace event when the active theme or its CSS changes.
Subscribe to it and re-apply the palette to every live figure — recomputing the
palette and calling Plotly's relayout is enough; do not redraw from scratch.

Keep the figure's *original* layout around for this. Re-merging a
previously-merged layout would treat the last theme's colours as author intent
and permanently freeze them.

---

## 5. Rendering behaviour

### Registration

Register a **markdown code-block processor** for the `plotly` language. That is
the correct API for this job — it gives you the block's source text, a container
element, and a rendering context, and it works in both reading view and live
preview. Do not use a generic markdown post-processor and pattern-match for
fences.

### Lifecycle and cleanup

Obsidian creates and destroys rendered blocks aggressively — scrolling, editing,
switching panes, and reopening notes all re-run the processor.

**Every rendered figure must be torn down when its block goes away.** Plotly
attaches event handlers and holds a reference to its container; without cleanup
you get leaked instances, duplicate re-renders, and eventually a sluggish app.

Attach a render child to the rendering context so you get an unload callback,
and in it purge the Plotly instance and unsubscribe anything that figure
registered. Test this by scrolling a long note past several figures repeatedly.

### Known pitfall: zero-width containers

In live preview a block is often rendered **before it has been laid out**, so the
container's width is `0`. Plotly will happily draw a zero-width chart, and it
will not fix itself when the element is later given a size.

Handle it. Either observe the element for its first non-zero size before
drawing, or draw with Plotly's responsive config and force a resize once the
element has dimensions. Verify specifically by opening a note whose figure is
below the fold and scrolling to it, not just by opening a note where the figure
is already visible.

### Config

- Responsive sizing on, so figures reflow with the pane.
- Give the container a sensible default height (roughly 320–400px) so it does
  not collapse before the figure loads.
- Consider hiding Plotly's mode bar by default; it is visual clutter in a note.
  Displaying it on hover is a reasonable alternative. Your call.

**Added 2026-09-10 (sizing).** A default height alone is not enough: a subplot
figure exported with `layout.height: 900` was being squeezed into the default
box, because an explicit width/height in the layout also makes Plotly ignore its
container entirely. Current behaviour, on top of the default above:

- The explicit `width`/`height` are lifted off the layout (top-level *and*
  template) onto the container, and Plotly autosizes into it.
- Container height = a size the reader dragged to, else the figure's own height,
  else the default. The figure's own *width* is ignored; the figure follows the
  note's column until the reader drags it wider.
- A drag handle in the bottom-right corner resizes a figure; the size is
  remembered in the plugin's own data, keyed by note path + figure basename.
  Nothing is written to the note or to the figure JSON.
- The theme palette covers every axis the figure actually uses (`xaxis2`,
  `yaxis3`, ...), not just the primary pair — otherwise subplot panels keep
  Plotly's default gridlines while the first panel follows the theme.

### Accessibility

Set the `alt` text as an accessible label on the figure container.

### Errors are visible, never silent

A figure that cannot be drawn must **say so, in place**. A blank gap in a note is
worse than an error message, because it looks like the plugin is broken rather
than the reference.

Render a readable message in the block for each of:

| Condition | Message should say |
|---|---|
| Fence body is not valid YAML | that it could not be parsed |
| `figure:` missing | that the key is required |
| `alt:` missing | that a text alternative is required, and that the site build will reject it |
| Named file not found in vault | the name it looked for |
| File is not valid JSON | that it could not be parsed |
| Plotly throws while drawing | the underlying error text |

Style these so they read as a notice, not as a chart. Do not use `console.log` as
the only signal — the author will not have the console open.

---

## 6. Bundling Plotly

**Superseded 2026-09-08:** this section originally scoped the plugin to the
`plotly-cartesian` distribution, for the reason described below. That was
revisited with the author after measuring the actual cost of the full bundle
(~2.85x the minified size, ~100ms of additional one-time load latency on the
first figure drawn per session — see the conversation that led to this change
for the numbers). The plugin now bundles the **full `plotly.js-dist`**
distribution, on the condition that the website is expanded to match it, so
the "preview must never promise what publication can't deliver" invariant
below still holds. The original reasoning is left in place because it's still
correct — it's the reason this needs to move in lockstep with the website,
not a reason to have avoided it forever.

<details>
<summary>Original text (§6, as first written)</summary>

**Decision: bundle the `plotly-cartesian` distribution (~1.4MB minified).**

This is the same bundle the website ships, and matching it is the point. It
covers every 2D trace type — scatter, bar, histogram, box, violin, heatmap,
contour. It does **not** include 3D, maps, or WebGL traces.

That limitation is deliberate and load-bearing: if the plugin shipped the full
bundle, a 3D figure would preview perfectly in Obsidian and then fail to render
on the published site. Preview must never promise something publication cannot
deliver. **Do not "upgrade" to the full bundle to make a figure work.** If a
figure needs 3D, that is a conversation about the website's bundle, not a change
to make here unilaterally.

</details>

### Requirements

- **Vendor it into the plugin build. Never load Plotly from a CDN.** Obsidian
  plugins must work offline, and pulling remote scripts into the app is both a
  security and a reliability problem.
- **Load it lazily** — only when the first figure on a page is about to render.
  A multi-megabyte library should not be parsed at app startup for the sake of
  vaults and sessions that contain no figures.
- **This must stay in lockstep with the website's own bundle.** The plugin and
  the site must support the same trace types, whichever bundle that turns out
  to be — that's the whole point of matching in the first place.

---

## 7. Repository shape and tooling

Standard Obsidian plugin layout. Nothing exotic.

```
manifest.json          id, name, version, minAppVersion, description, author
main.ts                plugin entry point
styles.css             error notice and container styling
esbuild.config.mjs     bundler config
package.json
tsconfig.json
versions.json          plugin version -> minimum Obsidian version
test-vault/            a small vault for manual verification (§8)
```

- **TypeScript**, bundled with **esbuild** to a single `main.js`. This is the
  conventional Obsidian toolchain; the official sample plugin uses it and the
  ecosystem's documentation assumes it.
- `obsidian` is a peer dependency, marked **external** in the bundler config —
  it is provided by the app at runtime and must not be bundled.
- Plotly **is** bundled (§6).
- Suggested plugin id: `plotly-figure-fences`. A community plugin already exists
  using the obvious `obsidian-plotly` name, so pick something distinct even
  though this is not being submitted anywhere.
- `isDesktopOnly`: set `false`. Plotly should work in Obsidian's mobile
  webview, but it is untested — if mobile misbehaves, flipping this to `true` is
  an acceptable resolution rather than a blocker.

### Distribution

**Personal use only.** Not submitted to the community plugin directory. Install
by copying the built `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/<plugin-id>/`, or via the BRAT plugin pointed at the
repo for auto-updates.

This means Obsidian's review guidelines do not constrain the design, but it also
means **there is no reviewer to catch mistakes** — the verification in §8 is the
only safety net.

---

## 8. Verification — read this before claiming anything works

**You cannot run Obsidian.** It is a desktop GUI application; there is no
headless mode you can drive from a terminal. This is the single most important
practical constraint on this project.

Therefore:

### What you can verify yourself

- **Type checking and build.** `tsc --noEmit` and a successful esbuild run.
- **Unit tests on the pure logic**, which is most of the interesting behaviour
  and has no Obsidian dependency:
  - fence parsing: valid input, missing `figure`, missing `alt`, empty body,
    malformed YAML, extra unknown keys
  - `mergeLayout`: theme fills gaps; author values win; nested objects merge;
    arrays replace wholesale; a previously-merged layout is not re-merged
  - palette construction with variables present and absent (fallbacks)
- Structure these so the Obsidian API is behind a thin boundary — file lookup and
  file reading — that tests can substitute. Keep parsing, merging and palette
  logic in plain modules importing nothing from `obsidian`.

### What you cannot verify and must hand off

Rendering, theming against real themes, live-preview behaviour, cleanup on
scroll, and mobile. **Do not report these as working.** Say plainly that they
need a human in the app, and give a short checklist to run:

1. Reading view renders a figure.
2. Live preview renders a figure, including one below the fold reached by
   scrolling (the zero-width case in §5).
3. Toggling light/dark re-themes without a reload.
4. A community theme still looks correct.
5. Each error in §5's table shows its message.
6. Scrolling a long note past several figures repeatedly does not degrade.

Ship `test-vault/` in the repo with notes covering each of those and the sample
JSON from §3, so the human check takes two minutes rather than requiring setup.

---

## 9. Suggested phases

Each should leave the repo in a working state.

**Phase 1 — skeleton.** Scaffold the plugin: manifest, build, a code-block
processor registered for `plotly` that renders the parsed `figure` and `alt` as
plain text. No Plotly yet.
*Done when:* the plugin loads in Obsidian and a fence shows its parsed values.

**Phase 2 — parsing and resolution.** YAML parsing, validation, vault lookup by
basename, JSON reading, and the full error table from §5. Still no chart.
*Done when:* every error case shows its message and a valid fence reports that it
found and parsed the file. Unit tests cover the parsing.

**Phase 3 — rendering.** Bundle Plotly, lazy-load it, draw the figure, handle
lifecycle and cleanup, and the zero-width container case.
*Done when:* a figure draws and is still healthy after scrolling away and back.

**Phase 4 — theming.** Palette from Obsidian variables via the probe, the merge
from §4, and re-theming on theme change.
*Done when:* switching light/dark restyles a live figure with no reload, and a
figure whose layout sets a colour keeps that colour.

**Phase 5 — polish.** `test-vault/`, README with install instructions, error
notice styling.

---

## 10. Questions to raise rather than guess

If any of these come up, ask — do not decide silently:

- A figure needs a trace type outside whatever bundle the plugin and website
  currently agree on (§6).
- The fence format seems to need a third key, or a different one (§2).
- Obsidian's API has changed such that a code-block processor cannot do this.
- Mobile turns out to be unworkable and you want to set `isDesktopOnly`.

---

## 11. Summary of decisions already made

Do not relitigate these. They were decided with the author.

| | |
|---|---|
| **Scope** | Render only. No authoring helpers, no editor, no vault writes. |
| **Plotly bundle** | Full `plotly.js-dist`, matching the website (superseded §6: originally `plotly-cartesian` only). |
| **Distribution** | Personal. Manual install or BRAT. Not submitted to community plugins. |
| **Language / build** | TypeScript, esbuild, single `main.js`. |
| **Fence format** | Fixed by §2. Shared contract with a published website. |
| **Missing `alt`** | An error surfaced in the rendered block, not a silent default. |
