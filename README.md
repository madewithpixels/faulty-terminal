# Faulty Terminal — Webflow Embed (adaptive, vanilla JS)

A self-contained, dependency-light port of the React Bits **Faulty Terminal**
background effect, adapted to run on plain HTML / Webflow without React or a build step.

This version adds:
- Vanilla-JS port (no React) — loads `ogl` from a CDN
- Adaptive performance: per-instance resolution budget + live FPS auto-tuning
- Pauses rendering when off-screen or when the browser tab is hidden
- Multi-instance support via the `.faulty-terminal` class
- Configurable glyph **tint** and **background** color

## Usage

1. Add a Div Block in Webflow, give it the class `faulty-terminal`.
2. Size/position it (e.g. `width:100%; height:100svh; position:absolute; inset:0`).
3. Paste the contents of `faulty-terminal.embed.html` once on the page
   (Embed element, or Page Settings → Custom Code → before `</body>`).

Per-element overrides via a `data-ft-opts` JSON attribute:

```html
<div class="faulty-terminal" data-ft-opts='{"tint":"#5a8a99","scale":1.6}'></div>
```

> Custom code runs on the **published** site, not the Designer preview.

## Configuration

Global defaults live in the `DEFAULTS` object at the top of the script.
Adaptive knobs: `maxPixels` (resolution budget), `renderScaleMin/Max`,
`autoTune`, `fpsLow`/`fpsHigh`, `targetFPS`, `dpr`.

See [`examples/webflow-usage.md`](./examples/webflow-usage.md) for layout details.

## Credits & License

This effect is derived from **React Bits** by **David Haz** (MIT + Commons Clause).
See [NOTICE.md](./NOTICE.md). Dependency: [`ogl`](https://github.com/oframe/ogl) (MIT).