import type { ThemeReader } from "./theme";

// CSS custom properties are substitution-only: getComputedStyle(el).getPropertyValue("--x")
// returns the property's literal text, not a resolved colour. If a theme
// defines a variable via light-dark(...)/color-mix(...)/var(...) chains,
// Plotly can't parse that text and silently falls back to its own defaults.
// Resolving through a probe element's `color`/`fontFamily` forces the
// browser to actually compute a value (§4).
const SENTINEL = "rgb(1, 2, 3)";

let probe: HTMLSpanElement | null = null;

function getProbe(): HTMLSpanElement {
	if (!probe) {
		probe = document.createElement("span");
		probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
		document.body.appendChild(probe);
	}
	return probe;
}

function resolveColor(name: string, fallback: string): string {
	const el = getProbe();
	el.style.color = SENTINEL;
	el.style.color = `var(${name})`;
	const value = getComputedStyle(el).color;
	return !value || value === SENTINEL ? fallback : value;
}

function resolveFont(name: string, fallback: string): string {
	const el = getProbe();
	el.style.fontFamily = "";
	el.style.fontFamily = `var(${name})`;
	const value = getComputedStyle(el).fontFamily;
	return !value ? fallback : value;
}

export const domThemeReader: ThemeReader = { color: resolveColor, font: resolveFont };

export function destroyColorProbe(): void {
	probe?.remove();
	probe = null;
}
