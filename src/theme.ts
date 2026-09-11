export interface ThemeReader {
	color(name: string, fallback: string): string;
	font(name: string, fallback: string): string;
}

export interface AxisPalette {
	gridcolor: string;
	zerolinecolor: string;
	linecolor: string;
}

type AxisKey = `${"x" | "y"}axis${string}`;

export interface Palette {
	colorway: string[];
	font: { color: string; family: string };
	paper_bgcolor: string;
	plot_bgcolor: string;
	modebar: { bgcolor: string; color: string; activecolor: string };
	/** `xaxis`, `yaxis`, and every subplot axis the figure actually uses. */
	[axis: AxisKey]: AxisPalette;
}

const LAYOUT_AXIS_KEY = /^[xy]axis\d*$/;
const TRACE_AXIS_REF = /^([xy])(\d*)$/;

/**
 * The axis keys a figure needs themed. A single-panel figure only has
 * `xaxis`/`yaxis`, but a subplot figure has `xaxis2`, `yaxis3`, ... and each is
 * styled independently by Plotly - miss one and that panel keeps Plotly's own
 * default gridlines while the rest follow the theme. Axes can be declared in
 * the layout, referenced only from a trace (`{"xaxis": "x2"}`), or both.
 */
export function collectAxisKeys(layout: Record<string, unknown>, data: unknown[] = []): string[] {
	const keys = new Set<string>(["xaxis", "yaxis"]);

	for (const key of Object.keys(layout)) {
		if (LAYOUT_AXIS_KEY.test(key)) keys.add(key);
	}

	for (const trace of data) {
		if (typeof trace !== "object" || trace === null) continue;
		for (const field of ["xaxis", "yaxis"] as const) {
			const ref = (trace as Record<string, unknown>)[field];
			if (typeof ref !== "string") continue;
			const match = TRACE_AXIS_REF.exec(ref);
			if (match) keys.add(`${match[1]}axis${match[2]}`);
		}
	}

	return [...keys];
}

/**
 * Builds the theme palette (§4) from Obsidian's CSS variables, via an
 * injected reader so this stays pure and testable without a real DOM.
 * Backgrounds are transparent so the note's own background shows through.
 */
export function buildPalette(theme: ThemeReader, axisKeys: string[] = ["xaxis", "yaxis"]): Palette {
	const buildAxis = (): AxisPalette => ({
		gridcolor: theme.color("--background-modifier-border", "#dadada"),
		zerolinecolor: theme.color("--background-modifier-border", "#dadada"),
		linecolor: theme.color("--background-modifier-border", "#dadada"),
	});

	const palette: Palette = {
		colorway: [
			theme.color("--interactive-accent", "#7f6df2"),
			theme.color("--text-muted", "#888888"),
			theme.color("--text-faint", "#aaaaaa"),
		],
		font: {
			color: theme.color("--text-normal", "#2e3338"),
			family: theme.font("--font-text", "-apple-system, BlinkMacSystemFont, sans-serif"),
		},
		paper_bgcolor: "rgba(0,0,0,0)",
		plot_bgcolor: "rgba(0,0,0,0)",
		// Plotly's own default mode bar is a hardcoded dark-grey box that
		// clashes with most Obsidian themes. Transparent background lets the
		// icons float directly on the note instead.
		modebar: {
			bgcolor: "rgba(0,0,0,0)",
			color: theme.color("--text-muted", "#888888"),
			activecolor: theme.color("--interactive-accent", "#7f6df2"),
		},
	};

	for (const key of axisKeys) {
		palette[key as AxisKey] = buildAxis();
	}

	return palette;
}
