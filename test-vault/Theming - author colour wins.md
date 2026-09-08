# Theming - author colour wins

This figure's JSON sets an explicit `line.color` (`#e05252`, a red). Toggle
light/dark and try a community theme (plan §4, "the author wins") - the line
should **stay that exact red** while the background, gridlines, axis text,
and font keep following the theme.

Contrast with [[Valid figure]], whose trace has no explicit colour and should
visibly change colour when the theme's accent colour changes.

```plotly
figure: author_color.json
alt: A line chart with an explicitly author-chosen red line colour.
```
