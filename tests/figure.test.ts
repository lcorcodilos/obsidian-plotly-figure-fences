import { describe, expect, it } from "vitest";
import { parseFigureJson } from "../src/figure";

describe("parseFigureJson", () => {
	it("parses data and layout", () => {
		const json = JSON.stringify({
			data: [{ type: "scatter" }],
			layout: { title: { text: "Example" } },
		});
		const result = parseFigureJson(json);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toHaveLength(1);
			expect(result.layout).toEqual({ title: { text: "Example" } });
		}
	});

	it("treats a missing data key as an empty array", () => {
		const result = parseFigureJson(JSON.stringify({ layout: {} }));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual([]);
	});

	it("treats a missing layout key as an empty object", () => {
		const result = parseFigureJson(JSON.stringify({ data: [] }));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.layout).toEqual({});
	});

	it("treats an empty JSON object as empty data/layout", () => {
		const result = parseFigureJson("{}");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual([]);
			expect(result.layout).toEqual({});
		}
	});

	it("reports invalid JSON", () => {
		const result = parseFigureJson("{ not json");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/not valid json/i);
	});
});
