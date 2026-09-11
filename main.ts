import { MarkdownPostProcessorContext, MarkdownRenderChild, Plugin } from "obsidian";
import type { Config, Data, Layout } from "plotly.js";
import { destroyColorProbe, domThemeReader } from "./src/colorProbe";
import {
	MIN_PLOT_HEIGHT,
	MIN_PLOT_WIDTH,
	readLayoutDimensions,
	resolvePlotSize,
	sizeKey,
	StoredSize,
	stripLayoutDimensions,
} from "./src/dimensions";
import { parseFigureJson } from "./src/figure";
import { mergeLayout } from "./src/mergeLayout";
import { parseFence } from "./src/parse";
import { loadPlotly, PlotlyModule } from "./src/plotly";
import { buildPalette, collectAxisKeys } from "./src/theme";
import { findFigureFile, readFigureFile } from "./src/vault";

const PLOT_CONFIG: Partial<Config> = { responsive: true, displayModeBar: "hover" };

/** Horizontal travel before a corner drag counts as "also resize the width". */
const WIDTH_DRAG_THRESHOLD = 6;
/** How close to the note's own width counts as "still fluid", not a fixed width. */
const WIDTH_SNAP_TOLERANCE = 4;
/** A drag fires continuously; only write the vault's plugin data once it settles. */
const SAVE_DEBOUNCE_MS = 500;

interface PluginData {
	sizes: Record<string, StoredSize>;
}

export default class PlotlyFigureFencesPlugin extends Plugin {
	private sizes: Record<string, StoredSize> = {};
	private saveTimer: number | null = null;
	private dirty = false;

	async onload() {
		const data = (await this.loadData()) as PluginData | null;
		this.sizes = data?.sizes ?? {};

		this.registerMarkdownCodeBlockProcessor("plotly", (source, el, ctx) => {
			ctx.addChild(new PlotlyFenceRenderChild(el, source, this, ctx));
		});
	}

	onunload() {
		destroyColorProbe();
		this.flushSizes();
	}

	storedSize(key: string): StoredSize | undefined {
		return this.sizes[key];
	}

	rememberSize(key: string, size: StoredSize) {
		const current = this.sizes[key];
		if (current && current.height === size.height && current.width === size.width) return;

		this.sizes[key] = size;
		this.dirty = true;
		if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
		this.saveTimer = window.setTimeout(() => this.flushSizes(), SAVE_DEBOUNCE_MS);
	}

	private flushSizes() {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		if (!this.dirty) return;
		this.dirty = false;
		void this.saveData({ sizes: this.sizes } satisfies PluginData);
	}
}

/**
 * Parses the fence, resolves and reads the figure JSON, and draws it with
 * Plotly, themed to the current Obsidian theme (§4) and re-themed live on
 * theme change. Every failure from §5's table is surfaced in place instead
 * of failing silently.
 */
class PlotlyFenceRenderChild extends MarkdownRenderChild {
	private destroyed = false;
	private resizeObserver: ResizeObserver | null = null;
	private frameEl: HTMLElement | null = null;
	private plotEl: HTMLElement | null = null;
	private plotly: PlotlyModule | null = null;
	private plotted = false;
	/** `plotted` means the draw started; this means Plotly has finished it. */
	private drawn = false;
	private figureData: unknown[] = [];
	// The figure's own layout, untouched apart from having any explicit
	// width/height lifted onto the frame. Re-theming always merges the fresh
	// palette against *this*, never against a previous merge result -
	// otherwise the last theme's colours would look like author intent and
	// freeze permanently (§4).
	private authorLayout: Record<string, unknown> | null = null;
	private axisKeys: string[] = [];
	private storageKey = "";

	constructor(
		containerEl: HTMLElement,
		private source: string,
		private plugin: PlotlyFigureFencesPlugin,
		private ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
	}

	onload() {
		void this.render();
	}

	onunload() {
		this.destroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		if (this.plotted && this.plotEl && this.plotly) {
			this.plotly.purge(this.plotEl);
		}
	}

	private showError(container: HTMLElement, message: string) {
		const notice = container.createDiv({ cls: "plotly-fence-error" });
		notice.createSpan({ cls: "plotly-fence-error-icon", text: "⚠" });
		notice.createSpan({ cls: "plotly-fence-error-message", text: message });
	}

	private async render() {
		const container = this.containerEl.createDiv({ cls: "plotly-fence" });

		const fence = parseFence(this.source);
		if (!fence.ok) {
			this.showError(container, fence.error);
			return;
		}

		const file = findFigureFile(this.plugin.app, fence.figure, this.ctx.sourcePath);
		if (!file) {
			this.showError(container, `Could not find a figure file named "${fence.figure}" anywhere in the vault.`);
			return;
		}

		let text: string;
		try {
			text = await readFigureFile(this.plugin.app, file);
		} catch (e) {
			this.showError(container, `Could not read "${file.path}": ${(e as Error).message}`);
			return;
		}
		if (this.destroyed) return;

		const figure = parseFigureJson(text);
		if (!figure.ok) {
			this.showError(container, figure.error);
			return;
		}

		await this.drawChart(container, fence.figure, figure.data, figure.layout, fence.alt);
	}

	private async drawChart(
		container: HTMLElement,
		figureName: string,
		data: unknown[],
		layout: Record<string, unknown>,
		alt: string,
	) {
		// The frame carries the size; Plotly autosizes into it. Keeping the
		// two separate means the resize handle only ever touches the frame and
		// Plotly only ever reads it, with nothing fighting over inline styles.
		const frame = container.createDiv({ cls: "plotly-fence-frame" });
		const plotEl = frame.createDiv({ cls: "plotly-fence-plot" });
		plotEl.setAttribute("role", "img");
		plotEl.setAttribute("aria-label", alt);
		this.frameEl = frame;
		this.plotEl = plotEl;

		this.figureData = data;
		this.authorLayout = stripLayoutDimensions(layout);
		this.axisKeys = collectAxisKeys(layout, data);
		this.storageKey = sizeKey(this.ctx.sourcePath, figureName);

		const size = resolvePlotSize(readLayoutDimensions(layout), this.plugin.storedSize(this.storageKey));
		frame.style.height = `${size.height}px`;
		if (size.width !== null) frame.style.width = `${size.width}px`;

		this.addResizeHandle(frame);

		// Observe before awaiting, so a width arriving during the load isn't
		// missed. The same observer then drives Plotly through every later
		// size change - a drag, or the note's column being resized.
		this.resizeObserver = new ResizeObserver(() => this.onFrameResize());
		this.resizeObserver.observe(frame);

		let plotly: PlotlyModule;
		try {
			plotly = await loadPlotly();
		} catch (e) {
			this.showError(container, `Could not load the Plotly library: ${(e as Error).message}`);
			return;
		}
		if (this.destroyed) return;
		this.plotly = plotly;

		this.registerEvent(this.plugin.app.workspace.on("css-change", () => this.retheme()));
		this.tryDraw();
	}

	/**
	 * Draws once the frame has a real width. Live preview can mount a block
	 * before it has been laid out (§5 "zero-width containers"), so this is a
	 * no-op until the observer reports a usable size.
	 */
	private tryDraw() {
		const { frameEl: frame, plotEl, plotly } = this;
		if (this.destroyed || this.plotted || !frame || !plotEl || !plotly) return;
		if (frame.clientWidth === 0) return;

		this.plotted = true;
		const themedLayout = this.mergeWithPalette(this.authorLayout ?? {});
		plotly
			.newPlot(plotEl, this.figureData as Data[], themedLayout as Partial<Layout>, PLOT_CONFIG)
			.then(() => {
				this.drawn = !this.destroyed;
			})
			.catch((e: Error) => {
				this.plotted = false;
				if (this.destroyed) return;
				plotEl.empty();
				this.showError(plotEl, `Plotly failed to draw this figure: ${e.message}`);
			});
	}

	private onFrameResize() {
		if (this.destroyed) return;
		if (!this.plotted) {
			this.tryDraw();
			return;
		}
		// Plotly refuses to resize a div it hasn't finished drawing into, so
		// wait for the draw rather than letting it throw mid-drag.
		if (!this.drawn || !this.plotly || !this.plotEl) return;
		// Typed as returning void, but really returns a promise that rejects if
		// the plot has been hidden or torn down in the meantime.
		const resized = this.plotly.Plots.resize(this.plotEl) as unknown as Promise<void> | undefined;
		void resized?.catch(() => undefined);
	}

	/**
	 * A drag handle in the bottom-right corner, rather than CSS `resize`: the
	 * native handle sits under Plotly's own drag layer, and it would also pin
	 * the width on a purely vertical drag, costing the figure its ability to
	 * follow the note's width.
	 */
	private addResizeHandle(frame: HTMLElement) {
		const handle = frame.createDiv({ cls: "plotly-fence-resize-handle" });
		handle.setAttribute("aria-hidden", "true");
		handle.setAttribute("title", "Drag to resize this figure");

		let pointerId: number | null = null;
		let startX = 0;
		let startY = 0;
		let startWidth = 0;
		let startHeight = 0;

		this.registerDomEvent(handle, "pointerdown", (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			pointerId = ev.pointerId;
			handle.setPointerCapture(ev.pointerId);
			const rect = frame.getBoundingClientRect();
			startX = ev.clientX;
			startY = ev.clientY;
			startWidth = rect.width;
			startHeight = rect.height;
			frame.addClass("is-resizing");
		});

		this.registerDomEvent(handle, "pointermove", (ev) => {
			if (pointerId === null || ev.pointerId !== pointerId) return;
			frame.style.height = `${Math.max(MIN_PLOT_HEIGHT, startHeight + (ev.clientY - startY))}px`;

			// Only take over the width once the drag is clearly horizontal, so
			// a vertical-only drag leaves the figure fluid.
			const dx = ev.clientX - startX;
			if (Math.abs(dx) > WIDTH_DRAG_THRESHOLD || frame.style.width) {
				frame.style.width = `${Math.max(MIN_PLOT_WIDTH, startWidth + dx)}px`;
			}
		});

		const endDrag = (ev: PointerEvent) => {
			if (pointerId === null || ev.pointerId !== pointerId) return;
			if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
			pointerId = null;
			frame.removeClass("is-resizing");
			this.saveCurrentSize();
		};
		this.registerDomEvent(handle, "pointerup", endDrag);
		this.registerDomEvent(handle, "pointercancel", endDrag);
	}

	private saveCurrentSize() {
		const frame = this.frameEl;
		if (!frame || !this.storageKey) return;

		const rect = frame.getBoundingClientRect();
		let width: number | undefined = frame.style.width ? Math.round(rect.width) : undefined;

		// Dragged back to (roughly) the note's own width: drop the fixed width
		// so the figure goes back to following the column.
		const noteWidth = frame.parentElement?.clientWidth ?? 0;
		if (width !== undefined && noteWidth > 0 && Math.abs(width - noteWidth) <= WIDTH_SNAP_TOLERANCE) {
			frame.style.width = "";
			width = undefined;
		}

		this.plugin.rememberSize(this.storageKey, { height: Math.round(rect.height), width });
	}

	private mergeWithPalette(layout: Record<string, unknown>): Record<string, unknown> {
		const palette = buildPalette(domThemeReader, this.axisKeys) as unknown as Record<string, unknown>;
		return mergeLayout(palette, layout);
	}

	private retheme() {
		if (!this.plotted || !this.plotEl || !this.plotly || !this.authorLayout) return;
		const themedLayout = this.mergeWithPalette(this.authorLayout);
		void this.plotly.relayout(this.plotEl, themedLayout as Partial<Layout>);
	}
}
