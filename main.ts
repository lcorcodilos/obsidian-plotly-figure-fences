import { App, MarkdownPostProcessorContext, MarkdownRenderChild, Plugin } from "obsidian";
import type { Config, Data, Layout } from "plotly.js";
import { destroyColorProbe, domThemeReader } from "./src/colorProbe";
import { parseFigureJson } from "./src/figure";
import { mergeLayout } from "./src/mergeLayout";
import { parseFence } from "./src/parse";
import { loadPlotly, PlotlyModule } from "./src/plotly";
import { buildPalette } from "./src/theme";
import { findFigureFile, readFigureFile } from "./src/vault";

export default class PlotlyFigureFencesPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("plotly", (source, el, ctx) => {
			ctx.addChild(new PlotlyFenceRenderChild(el, source, this.app, ctx));
		});
	}

	onunload() {
		destroyColorProbe();
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
	private plotEl: HTMLElement | null = null;
	private plotly: PlotlyModule | null = null;
	private plotted = false;
	// The figure's own layout, untouched by any merge. Re-themeing always
	// merges the fresh palette against *this*, never against a previous
	// merge result - otherwise the last theme's colours would look like
	// author intent and freeze permanently (§4).
	private authorLayout: Record<string, unknown> | null = null;

	constructor(
		containerEl: HTMLElement,
		private source: string,
		private app: App,
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
		container.createDiv({ cls: "plotly-fence-error", text: message });
	}

	private async render() {
		const container = this.containerEl.createDiv({ cls: "plotly-fence" });

		const fence = parseFence(this.source);
		if (!fence.ok) {
			this.showError(container, fence.error);
			return;
		}

		const file = findFigureFile(this.app, fence.figure, this.ctx.sourcePath);
		if (!file) {
			this.showError(container, `Could not find a figure file named "${fence.figure}" anywhere in the vault.`);
			return;
		}

		let text: string;
		try {
			text = await readFigureFile(this.app, file);
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

		await this.drawChart(container, figure.data, figure.layout, fence.alt);
	}

	private async drawChart(
		container: HTMLElement,
		data: unknown[],
		layout: Record<string, unknown>,
		alt: string,
	) {
		const plotEl = container.createDiv({ cls: "plotly-fence-plot" });
		plotEl.setAttribute("role", "img");
		plotEl.setAttribute("aria-label", alt);
		this.plotEl = plotEl;
		this.authorLayout = layout;

		let plotly: PlotlyModule;
		try {
			plotly = await loadPlotly();
		} catch (e) {
			this.showError(container, `Could not load the Plotly library: ${(e as Error).message}`);
			return;
		}
		if (this.destroyed) return;
		this.plotly = plotly;

		const config: Partial<Config> = { responsive: true, displayModeBar: false };

		const draw = () => {
			if (this.destroyed || this.plotted || plotEl.clientWidth === 0) return;
			this.plotted = true;
			this.resizeObserver?.disconnect();
			this.resizeObserver = null;

			const themedLayout = this.mergeWithPalette(layout);
			plotly
				.newPlot(plotEl, data as Data[], themedLayout as Partial<Layout>, config)
				.catch((e: Error) => {
					this.plotted = false;
					if (this.destroyed) return;
					plotEl.empty();
					this.showError(plotEl, `Plotly failed to draw this figure: ${e.message}`);
				});
		};

		if (plotEl.clientWidth > 0) {
			draw();
		} else {
			// Live preview can mount this block before it has been laid out
			// (§5 "zero-width containers"): wait for a real size instead of
			// drawing a zero-width chart that never fixes itself.
			this.resizeObserver = new ResizeObserver(draw);
			this.resizeObserver.observe(plotEl);
		}

		this.registerEvent(this.app.workspace.on("css-change", () => this.retheme()));
	}

	private mergeWithPalette(layout: Record<string, unknown>): Record<string, unknown> {
		const palette = buildPalette(domThemeReader) as unknown as Record<string, unknown>;
		return mergeLayout(palette, layout);
	}

	private retheme() {
		if (!this.plotted || !this.plotEl || !this.plotly || !this.authorLayout) return;
		const themedLayout = this.mergeWithPalette(this.authorLayout);
		void this.plotly.relayout(this.plotEl, themedLayout as Partial<Layout>);
	}
}
