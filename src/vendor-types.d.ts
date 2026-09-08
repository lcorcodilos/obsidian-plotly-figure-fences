// "plotly.js-cartesian-dist" ships no type declarations of its own; it is the
// same UMD module shape as "plotly.js" (§6), just missing the 3D/map/WebGL
// trace types. Borrow the community types for that module.
declare module "plotly.js-cartesian-dist" {
	import * as Plotly from "plotly.js";
	export = Plotly;
}
