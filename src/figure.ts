export type FigureJsonResult =
	| { ok: true; data: unknown[]; layout: Record<string, unknown> }
	| { ok: false; error: string };

/**
 * Parses the JSON contract from §3: `data` (array of traces) and `layout`
 * (object), either of which may be missing and should be treated as `[]` /
 * `{}` rather than an error. Pure logic, no Obsidian dependency.
 */
export function parseFigureJson(text: string): FigureJsonResult {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (e) {
		return { ok: false, error: `Figure file is not valid JSON: ${(e as Error).message}` };
	}

	const record = isPlainObject(raw) ? raw : {};
	const data = Array.isArray(record.data) ? record.data : [];
	const layout = isPlainObject(record.layout) ? record.layout : {};

	return { ok: true, data, layout };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
