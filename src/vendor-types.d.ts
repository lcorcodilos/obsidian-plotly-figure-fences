// "plotly.js-dist" ships no type declarations of its own; it is the same
// UMD module shape as "plotly.js". Borrow the community types for that
// module.
declare module "plotly.js-dist" {
	import * as Plotly from "plotly.js";
	export = Plotly;
}
