import { describe, expect, it } from "vitest";
import {
	DEFAULT_PLOT_HEIGHT,
	MIN_PLOT_HEIGHT,
	readLayoutDimensions,
	resolvePlotSize,
	sizeKey,
	stripLayoutDimensions,
} from "../src/dimensions";

describe("readLayoutDimensions", () => {
	it("reads an explicit width and height", () => {
		expect(readLayoutDimensions({ width: 1200, height: 900 })).toEqual({ width: 1200, height: 900 });
	});

	it("reports nothing when the layout has no size", () => {
		expect(readLayoutDimensions({ title: { text: "Hi" } })).toEqual({ width: null, height: null });
	});

	it("ignores values that aren't usable pixel sizes", () => {
		expect(readLayoutDimensions({ width: "900", height: 0 })).toEqual({ width: null, height: null });
		expect(readLayoutDimensions({ height: -100 })).toEqual({ width: null, height: null });
		expect(readLayoutDimensions({ height: Number.NaN })).toEqual({ width: null, height: null });
	});

	it("falls back to a size set by the figure's template", () => {
		expect(readLayoutDimensions({ template: { layout: { height: 800 } } })).toEqual({
			width: null,
			height: 800,
		});
	});

	it("prefers the layout's own size over the template's", () => {
		const dims = readLayoutDimensions({ height: 500, template: { layout: { height: 800 } } });
		expect(dims.height).toBe(500);
	});
});

describe("stripLayoutDimensions", () => {
	it("removes width and height so Plotly autosizes into its container", () => {
		const stripped = stripLayoutDimensions({ width: 1200, height: 900, showlegend: false });
		expect(stripped).toEqual({ showlegend: false });
	});

	it("removes a size hidden in the template too", () => {
		const stripped = stripLayoutDimensions({
			height: 900,
			template: { layout: { height: 800, font: { size: 12 } } },
		});
		expect(stripped).toEqual({ template: { layout: { font: { size: 12 } } } });
	});

	it("leaves the original layout untouched", () => {
		const layout = { height: 900, template: { layout: { width: 700 } } };
		stripLayoutDimensions(layout);
		expect(layout).toEqual({ height: 900, template: { layout: { width: 700 } } });
	});

	it("passes through a layout that has no size to strip", () => {
		const layout = { title: { text: "Hi" }, template: { layout: { font: { size: 12 } } } };
		expect(stripLayoutDimensions(layout)).toEqual(layout);
	});
});

describe("resolvePlotSize", () => {
	it("uses the default when neither the figure nor the reader set a height", () => {
		expect(resolvePlotSize({ width: null, height: null }, undefined)).toEqual({
			height: DEFAULT_PLOT_HEIGHT,
			width: null,
		});
	});

	it("honours a tall figure's own height", () => {
		expect(resolvePlotSize({ width: null, height: 900 }, undefined).height).toBe(900);
	});

	it("ignores the figure's own width so it still fits the note's column", () => {
		expect(resolvePlotSize({ width: 1200, height: 900 }, undefined).width).toBeNull();
	});

	it("lets a size the reader dragged to win over the figure's own height", () => {
		expect(resolvePlotSize({ width: null, height: 900 }, { height: 420 })).toEqual({
			height: 420,
			width: null,
		});
	});

	it("keeps a width the reader dragged to", () => {
		expect(resolvePlotSize({ width: null, height: null }, { height: 420, width: 980 })).toEqual({
			height: 420,
			width: 980,
		});
	});

	it("never resolves below the minimum height", () => {
		expect(resolvePlotSize({ width: null, height: 10 }, undefined).height).toBe(MIN_PLOT_HEIGHT);
	});
});

describe("sizeKey", () => {
	it("scopes a remembered size to one figure in one note", () => {
		expect(sizeKey("Notes/Report.md", "subplots.json")).not.toBe(
			sizeKey("Notes/Other.md", "subplots.json"),
		);
		expect(sizeKey("Notes/Report.md", "a.json")).not.toBe(sizeKey("Notes/Report.md", "b.json"));
	});
});
