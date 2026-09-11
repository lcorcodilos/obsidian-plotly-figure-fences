# Large subplots

A four-panel figure whose layout asks for `height: 900` (and `width: 1100`) —
the case that used to be squeezed into a fixed 360px box.

Expected:

- It draws 900px tall, not 360px, so all four panels have room.
- It is the width of the note's column, **not** 1100px — the figure's own
  width is ignored so it still fits the page.
- Gridlines and axis lines in all four panels follow the theme, not just the
  top-left one.
- Hovering shows a drag handle in the bottom-right corner; dragging it resizes
  the figure and the chart reflows live.
- The dragged size survives scrolling away and back, and reopening the note.

```plotly
figure: subplots.json
alt: Four panels showing coverage, findings, latency, and drift by quarter.
```

Below the figure, so it's obvious whether the figure overlaps the text instead
of taking up its own space.
