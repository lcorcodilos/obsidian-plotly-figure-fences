import { MarkdownRenderChild, Plugin } from "obsidian";
import { parseFence } from "./src/parse";

export default class PlotlyFigureFencesPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("plotly", (source, el, ctx) => {
			ctx.addChild(new PlotlyFenceRenderChild(el, source));
		});
	}
}

/**
 * Skeleton render child (Phase 1): parses the fence and shows the parsed
 * values as plain text. Rendering with Plotly comes in Phase 3.
 */
class PlotlyFenceRenderChild extends MarkdownRenderChild {
	constructor(containerEl: HTMLElement, private source: string) {
		super(containerEl);
	}

	onload() {
		const container = this.containerEl.createDiv({ cls: "plotly-fence" });
		const result = parseFence(this.source);

		if (result.error) {
			container.createDiv({ cls: "plotly-fence-error", text: result.error });
			return;
		}

		container.createDiv({ text: `figure: ${result.figure}` });
		container.createDiv({ text: `alt: ${result.alt}` });
	}
}
