# Webflow usage

## Per-section setup (for full-height backgrounds)

For each section that should have the effect:

1. Make the **Section** `position: relative` (so the background can sit behind content).
2. Inside it, add a **Div Block** with:
   - class: `faulty-terminal`
   - `position: absolute`, `inset: 0` (top/right/bottom/left = 0)
   - or `width: 100%`, `height: 100svh`
   - lower `z-index` than your content
3. Put your section content in a sibling div with a higher `z-index`.

## Adding the script

Add the contents of `faulty-terminal.embed.html` **once** per page, either:
- in an **Embed** element anywhere on the page, or
- Page Settings → Custom Code → **Before `</body>` tag**.

The script auto-initializes every `.faulty-terminal` element on the page.
Off-screen instances are paused, so stacked full-height sections won't all
render at once.

## Per-instance overrides

```html
<div class="faulty-terminal" data-ft-opts='{"tint":"#5a8a99","curvature":0.1}'></div>
```

## Notes
- Custom code only runs on the **published** site, not the Designer preview.
- `scale` and `digitSize` change the look but NOT performance.
- Performance scales with rendered pixel area; `maxPixels` caps it adaptively.