export type PlotlyModule = typeof import("plotly.js-dist");

let plotlyPromise: Promise<PlotlyModule> | null = null;

/**
 * Loads the bundled full Plotly distribution on first use (§6 - originally
 * scoped to `plotly-cartesian` only, later expanded to the full bundle
 * alongside a matching expansion on the website's side). It is vendored into
 * the plugin build (never fetched from a CDN); the dynamic import only
 * defers *executing* the multi-megabyte module until a figure actually needs
 * to draw, so a vault with no `plotly` fences never pays that cost.
 */
export function loadPlotly(): Promise<PlotlyModule> {
	if (!plotlyPromise) {
		plotlyPromise = import("plotly.js-dist").then((mod) => {
			const candidate = (mod as unknown as { default?: PlotlyModule }).default;
			return candidate ?? (mod as unknown as PlotlyModule);
		});
	}
	return plotlyPromise;
}
