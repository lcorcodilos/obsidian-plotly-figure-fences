import { describe, expect, it } from "vitest";
import { parseFence } from "../src/parse";

describe("parseFence", () => {
	it("parses a valid fence", () => {
		const result = parseFence("figure: coverage_by_quarter.json\nalt: Detection coverage by quarter.");
		expect(result).toEqual({
			ok: true,
			figure: "coverage_by_quarter.json",
			alt: "Detection coverage by quarter.",
		});
	});

	it("ignores unrecognised extra keys", () => {
		const result = parseFence("figure: a.json\nalt: some alt\ntitle: unused");
		expect(result).toEqual({ ok: true, figure: "a.json", alt: "some alt" });
	});

	it("reports an empty body", () => {
		const result = parseFence("   \n  ");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/empty/i);
	});

	it("reports malformed YAML", () => {
		const result = parseFence("figure: [unterminated");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/could not parse.*yaml/i);
	});

	it("reports a missing figure key", () => {
		const result = parseFence("alt: some alt");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/figure/i);
	});

	it("reports a missing alt key", () => {
		const result = parseFence("figure: a.json");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/alt/i);
	});

	it("rejects a body that is not a mapping", () => {
		const result = parseFence("- just\n- a list");
		expect(result.ok).toBe(false);
	});

	it("rejects blank figure/alt values", () => {
		const result = parseFence('figure: ""\nalt: ""');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/figure/i);
	});
});
