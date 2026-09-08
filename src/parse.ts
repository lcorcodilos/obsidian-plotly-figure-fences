import { load as parseYaml } from "js-yaml";

export interface ParsedFence {
	figure?: string;
	alt?: string;
	error?: string;
}

/**
 * Parses a `plotly` fence body (YAML with `figure` and `alt` keys). Pure
 * logic, no Obsidian dependency, so it can be unit tested directly.
 */
export function parseFence(source: string): ParsedFence {
	const trimmed = source.trim();
	if (trimmed.length === 0) {
		return { error: 'Empty plotly fence: expected "figure" and "alt" keys.' };
	}

	let data: unknown;
	try {
		data = parseYaml(trimmed);
	} catch (e) {
		return { error: `Could not parse fence body as YAML: ${(e as Error).message}` };
	}

	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		return { error: 'Plotly fence body must be a YAML mapping with "figure" and "alt" keys.' };
	}

	const record = data as Record<string, unknown>;
	const figure = record.figure;
	const alt = record.alt;

	if (typeof figure !== "string" || figure.trim().length === 0) {
		return { error: 'Missing required "figure" key: the basename of a committed figure JSON file.' };
	}
	if (typeof alt !== "string" || alt.trim().length === 0) {
		return {
			error:
				'Missing required "alt" key: a text alternative is required (the site build will reject a figure without one).',
		};
	}

	return { figure, alt };
}
