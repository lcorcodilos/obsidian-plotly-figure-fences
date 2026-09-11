/**
 * Figure sizing. A `plotly` fence has no size key - the fence format is a
 * fixed contract shared with the website (§2) and this plugin doesn't extend
 * it - so a figure's height comes from the figure's own layout, or from a size
 * the reader dragged it to, or from a default. Pure, no DOM/Obsidian
 * dependency.
 */

/** Height used when neither the figure nor the reader specified one. */
export const DEFAULT_PLOT_HEIGHT = 360;
/** Floors for the drag handle, so a figure can't be collapsed to nothing. */
export const MIN_PLOT_HEIGHT = 120;
export const MIN_PLOT_WIDTH = 200;

export interface FigureDimensions {
	width: number | null;
	height: number | null;
}

/** A size the reader dragged a figure to; `width` unset means "fill the note". */
export interface StoredSize {
	height: number;
	width?: number;
}

export interface PlotSize {
	height: number;
	/** `null` means fill the available width rather than a fixed pixel width. */
	width: number | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * A Plotly template can carry its own `layout.width`/`layout.height`, which
 * Plotly honours exactly like a top-level one - so both places matter.
 */
function templateLayout(layout: Record<string, unknown>): Record<string, unknown> | null {
	const template = layout.template;
	if (!isPlainObject(template)) return null;
	return isPlainObject(template.layout) ? template.layout : null;
}

/** Reads the explicit pixel size a figure's layout asks for, if any. */
export function readLayoutDimensions(layout: Record<string, unknown>): FigureDimensions {
	const template = templateLayout(layout);
	const from = (key: "width" | "height") =>
		positiveNumber(layout[key]) ?? (template ? positiveNumber(template[key]) : null);
	return { width: from("width"), height: from("height") };
}

/**
 * Returns a copy of the layout with every explicit width/height removed.
 * An explicit size makes Plotly ignore its container, which would both clip a
 * tall figure inside a short container and make the resize handle do nothing;
 * the size moves onto the container instead and Plotly autosizes into it.
 * Never mutates the input - the original layout stays pristine for re-theming.
 */
export function stripLayoutDimensions(layout: Record<string, unknown>): Record<string, unknown> {
	const out = { ...layout };
	delete out.width;
	delete out.height;

	const template = layout.template;
	const inner = templateLayout(layout);
	if (isPlainObject(template) && inner && ("width" in inner || "height" in inner)) {
		const innerCopy = { ...inner };
		delete innerCopy.width;
		delete innerCopy.height;
		out.template = { ...template, layout: innerCopy };
	}
	return out;
}

/**
 * Size precedence: a size the reader dragged this figure to wins, then the
 * figure's own layout height, then the default. The figure's own *width* is
 * deliberately ignored: a figure authored 1200px wide should still fit the
 * note's column, so only a width the reader chose pins the width.
 */
export function resolvePlotSize(
	dimensions: FigureDimensions,
	stored: StoredSize | undefined,
): PlotSize {
	return {
		height:
			positiveNumber(stored?.height) ??
			(dimensions.height !== null ? Math.max(MIN_PLOT_HEIGHT, dimensions.height) : DEFAULT_PLOT_HEIGHT),
		width: positiveNumber(stored?.width),
	};
}

/** Key a remembered size is stored under: per figure, per note. */
export function sizeKey(sourcePath: string, figure: string): string {
	return `${sourcePath}::${figure}`;
}
