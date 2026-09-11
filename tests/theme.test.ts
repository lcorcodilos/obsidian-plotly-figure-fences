import { describe, expect, it } from "vitest";
import { buildPalette, collectAxisKeys, ThemeReader } from "../src/theme";

function fakeReader(vars: Record<string, string>): ThemeReader {
	return {
		color: (name, fallback) => vars[name] ?? fallback,
		font: (name, fallback) => vars[name] ?? fallback,
	};
}

describe("buildPalette", () => {
	it("uses resolved theme variables when present", () => {
		const palette = buildPalette(
			fakeReader({
				"--interactive-accent": "rgb(1, 2, 3)",
				"--text-normal": "rgb(10, 10, 10)",
				"--text-muted": "rgb(20, 20, 20)",
				"--font-text": "Inter, sans-serif",
			}),
		);
		expect(palette.colorway[0]).toBe("rgb(1, 2, 3)");
		expect(palette.font.color).toBe("rgb(10, 10, 10)");
		expect(palette.font.family).toBe("Inter, sans-serif");
		expect(palette.modebar.activecolor).toBe("rgb(1, 2, 3)");
		expect(palette.modebar.color).toBe("rgb(20, 20, 20)");
	});

	it("falls back when a theme omits a variable", () => {
		const palette = buildPalette(fakeReader({}));
		expect(palette.colorway).toHaveLength(3);
		expect(palette.colorway.every((c) => typeof c === "string" && c.length > 0)).toBe(true);
		expect(palette.font.color.length).toBeGreaterThan(0);
		expect(palette.font.family.length).toBeGreaterThan(0);
	});

	it("keeps backgrounds transparent so the note's own background shows through", () => {
		const palette = buildPalette(fakeReader({}));
		expect(palette.paper_bgcolor).toBe("rgba(0,0,0,0)");
		expect(palette.plot_bgcolor).toBe("rgba(0,0,0,0)");
		expect(palette.modebar.bgcolor).toBe("rgba(0,0,0,0)");
	});

	it("themes the primary axes by default", () => {
		const palette = buildPalette(fakeReader({ "--background-modifier-border": "rgb(5, 5, 5)" }));
		expect(palette.xaxis.gridcolor).toBe("rgb(5, 5, 5)");
		expect(palette.yaxis.linecolor).toBe("rgb(5, 5, 5)");
	});

	it("themes every subplot axis it is given, not just the first panel", () => {
		const palette = buildPalette(fakeReader({ "--background-modifier-border": "rgb(5, 5, 5)" }), [
			"xaxis",
			"yaxis",
			"xaxis2",
			"yaxis2",
		]);
		expect(palette.xaxis2.gridcolor).toBe("rgb(5, 5, 5)");
		expect(palette.yaxis2.zerolinecolor).toBe("rgb(5, 5, 5)");
	});
});

describe("collectAxisKeys", () => {
	it("always includes the primary axes", () => {
		expect(collectAxisKeys({})).toEqual(["xaxis", "yaxis"]);
	});

	it("picks up subplot axes declared in the layout", () => {
		const keys = collectAxisKeys({ xaxis: {}, yaxis: {}, xaxis2: {}, yaxis3: {}, title: {} });
		expect(new Set(keys)).toEqual(new Set(["xaxis", "yaxis", "xaxis2", "yaxis3"]));
	});

	it("picks up axes only a trace refers to", () => {
		const keys = collectAxisKeys({}, [{ xaxis: "x2", yaxis: "y2" }, { xaxis: "x" }]);
		expect(new Set(keys)).toEqual(new Set(["xaxis", "yaxis", "xaxis2", "yaxis2"]));
	});

	it("ignores layout keys and traces that don't name an axis", () => {
		const keys = collectAxisKeys({ annotations: [], "xaxis-ish": {} }, [null, "nope", { xaxis: 7 }]);
		expect(keys).toEqual(["xaxis", "yaxis"]);
	});
});
