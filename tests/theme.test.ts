import { describe, expect, it } from "vitest";
import { buildPalette, ThemeReader } from "../src/theme";

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
				"--font-text": "Inter, sans-serif",
			}),
		);
		expect(palette.colorway[0]).toBe("rgb(1, 2, 3)");
		expect(palette.font.color).toBe("rgb(10, 10, 10)");
		expect(palette.font.family).toBe("Inter, sans-serif");
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
	});
});
