/**
 * Deep-merges a theme palette (`base`) under a figure's own layout
 * (`override`), so the author's own values always win (§4). Only fills gaps
 * the author's layout left unset; recurses into plain objects so e.g.
 * `{ xaxis: { title } }` still gets the theme's `xaxis.gridcolor`. Arrays are
 * replaced wholesale, never merged element-wise. Pure, no DOM/Obsidian
 * dependency - this must match the website's algorithm exactly.
 */
export function mergeLayout(
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...override };
	for (const key of Object.keys(base)) {
		const b = base[key];
		const o = override[key];
		if (o === undefined) {
			out[key] = b;
		} else if (b && o && typeof b === "object" && !Array.isArray(b)) {
			out[key] = mergeLayout(b as Record<string, unknown>, o as Record<string, unknown>);
		}
	}
	return out;
}
