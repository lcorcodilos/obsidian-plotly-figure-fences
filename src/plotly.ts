export type PlotlyModule = typeof import("plotly.js-cartesian-dist");

let plotlyPromise: Promise<PlotlyModule> | null = null;

/**
 * Loads the bundled `plotly-cartesian` distribution (§6) on first use. It is
 * vendored into the plugin build (never fetched from a CDN); the dynamic
 * import only defers *executing* the ~1.4MB module until a figure actually
 * needs to draw, so a vault with no `plotly` fences never pays that cost.
 */
export function loadPlotly(): Promise<PlotlyModule> {
	if (!plotlyPromise) {
		plotlyPromise = import("plotly.js-cartesian-dist").then((mod) => {
			const candidate = (mod as unknown as { default?: PlotlyModule }).default;
			return candidate ?? (mod as unknown as PlotlyModule);
		});
	}
	return plotlyPromise;
}
