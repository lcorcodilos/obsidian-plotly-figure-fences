import { App, MarkdownPostProcessorContext, MarkdownRenderChild, Plugin } from "obsidian";
import type { Config, Data, Layout } from "plotly.js";
import { parseFigureJson } from "./src/figure";
import { parseFence } from "./src/parse";
import { loadPlotly, PlotlyModule } from "./src/plotly";
import { findFigureFile, readFigureFile } from "./src/vault";

export default class PlotlyFigureFencesPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("plotly", (source, el, ctx) => {
			ctx.addChild(new PlotlyFenceRenderChild(el, source, this.app, ctx));
		});
	}
}

/**
 * Parses the fence, resolves and reads the figure JSON, and draws it with
 * Plotly. Every failure from §5's table is surfaced in place instead of
 * failing silently. Theming (§4) arrives in Phase 4.
 */
class PlotlyFenceRenderChild extends MarkdownRenderChild {
	private destroyed = false;
	private resizeObserver: ResizeObserver | null = null;
	private plotEl: HTMLElement | null = null;
	private plotly: PlotlyModule | null = null;
	private plotted = false;

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

			plotly
				.newPlot(plotEl, data as Data[], layout as Partial<Layout>, config)
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
	}
}
