import { App, MarkdownPostProcessorContext, MarkdownRenderChild, Plugin } from "obsidian";
import { parseFigureJson } from "./src/figure";
import { parseFence } from "./src/parse";
import { findFigureFile, readFigureFile } from "./src/vault";

export default class PlotlyFigureFencesPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("plotly", (source, el, ctx) => {
			ctx.addChild(new PlotlyFenceRenderChild(el, source, this.app, ctx));
		});
	}
}

/**
 * Phase 2: parses the fence, resolves and reads the figure JSON, and
 * surfaces every error from §5's table. Still no chart — that's Phase 3.
 */
class PlotlyFenceRenderChild extends MarkdownRenderChild {
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

		const figure = parseFigureJson(text);
		if (!figure.ok) {
			this.showError(container, figure.error);
			return;
		}

		// Chart rendering arrives in Phase 3; report the successful parse for now.
		container.createDiv({
			text: `Parsed ${file.path}: ${figure.data.length} trace(s). alt: ${fence.alt}`,
		});
	}
}
