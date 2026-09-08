export interface ThemeReader {
	color(name: string, fallback: string): string;
	font(name: string, fallback: string): string;
}

export interface Palette {
	colorway: string[];
	font: { color: string; family: string };
	paper_bgcolor: string;
	plot_bgcolor: string;
	xaxis: { gridcolor: string; zerolinecolor: string; linecolor: string };
	yaxis: { gridcolor: string; zerolinecolor: string; linecolor: string };
}

/**
 * Builds the theme palette (§4) from Obsidian's CSS variables, via an
 * injected reader so this stays pure and testable without a real DOM.
 * Backgrounds are transparent so the note's own background shows through.
 */
export function buildPalette(theme: ThemeReader): Palette {
	const buildAxis = () => ({
		gridcolor: theme.color("--background-modifier-border", "#dadada"),
		zerolinecolor: theme.color("--background-modifier-border", "#dadada"),
		linecolor: theme.color("--background-modifier-border", "#dadada"),
	});

	return {
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
		xaxis: buildAxis(),
		yaxis: buildAxis(),
	};
}
