import { describe, expect, it } from "vitest";
import { mergeLayout } from "../src/mergeLayout";

describe("mergeLayout", () => {
	it("fills gaps the author's layout left unset", () => {
		const base = { paper_bgcolor: "rgba(0,0,0,0)", font: { color: "red" } };
		const override = {};
		expect(mergeLayout(base, override)).toEqual(base);
	});

	it("lets the author's own values win", () => {
		const base = { font: { color: "red" } };
		const override = { font: { color: "blue" } };
		expect(mergeLayout(base, override)).toEqual({ font: { color: "blue" } });
	});

	it("recurses into nested plain objects instead of replacing them wholesale", () => {
		const base = { xaxis: { gridcolor: "grey", linecolor: "grey" } };
		const override = { xaxis: { title: { text: "x" } } };
		expect(mergeLayout(base, override)).toEqual({
			xaxis: { gridcolor: "grey", linecolor: "grey", title: { text: "x" } },
		});
	});

	it("replaces arrays wholesale rather than merging element-wise", () => {
		const base = { colorway: ["red", "green", "blue"] };
		const override = { colorway: ["purple"] };
		expect(mergeLayout(base, override)).toEqual({ colorway: ["purple"] });
	});

	it("does not touch keys only present in the override", () => {
		const base = {};
		const override = { title: { text: "Example" } };
		expect(mergeLayout(base, override)).toEqual({ title: { text: "Example" } });
	});

	it("must be re-run against the original layout, not a previous merge result", () => {
		const originalAuthorLayout = {};
		const firstTheme = { font: { color: "red" } };
		const secondTheme = { font: { color: "blue" } };

		const firstMerge = mergeLayout(firstTheme, originalAuthorLayout);
		expect(firstMerge).toEqual({ font: { color: "red" } });

		// Correct usage: re-merge the pristine original layout against the
		// new theme every time.
		const correctSecondMerge = mergeLayout(secondTheme, originalAuthorLayout);
		expect(correctSecondMerge).toEqual({ font: { color: "blue" } });

		// The pitfall §4 warns about: re-merging the *previous merge result*
		// instead of the original freezes the first theme's colour, because
		// it now looks like the author explicitly chose "red".
		const pitfallSecondMerge = mergeLayout(secondTheme, firstMerge);
		expect(pitfallSecondMerge).toEqual({ font: { color: "red" } });
	});
});
