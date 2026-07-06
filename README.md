# faulty-terminal

A WebGL dot-matrix terminal effect for Webflow (and any HTML page). Renders an animated field of glyphs with scanlines, glitch, mouse reactivity, and a circular ripple reveal — all in a single paste-able embed file.

Built by [madewithpixels](https://madewithpixels.com).

---

## Files

| File | Purpose |
|------|---------|
| `faulty-terminal.embed.html` | The complete effect — paste into Webflow or any HTML page |

---

## Quick start

1. Add a `<div class="faulty-terminal">` wherever you want the effect.
2. Paste the contents of `faulty-terminal.embed.html` into a **Before `</body>` tag** custom code block (Webflow), or just before `</body>` in plain HTML.
3. The effect auto-initialises on every `.faulty-terminal` element on the page.

> **Note:** Custom code runs on the **published** Webflow site, not in the Designer preview.

---

## Ripple reveal

The ripple is a circular wave that sweeps outward from an origin point, revealing the terminal field as it passes. Trigger it by adding the class `does-ripple` to the container element — typically via a Webflow interaction on page load or scroll-into-view.

```html
<div class="faulty-terminal does-ripple"></div>
```

### Aftershock

A secondary ring fires automatically after the main ripple completes, using the same origin and colour gradient. `aftershockTriggerAt` controls how far through the main ripple it launches (e.g. `0.82` = 82% through). `aftershockDelay` adds an optional ms pause on top of that.

---

## Per-element options

Pass options as a `data-ft-opts` attribute using single-quoted JSON (required by Webflow's attribute parser):

```html
<div class="faulty-terminal"
     data-ft-opts="{'tint':'#ff6b6b','ripple':false}">
</div>
```

### Disable ripple on a specific element

```html
<div class="faulty-terminal" data-ft-no-ripple></div>
<!-- or -->
<div class="faulty-terminal" data-ft-ripple="false"></div>
```

### Custom ripple origin

By default the ripple expands from the centre of the container. Point it at any element on the page:

```html
<div class="faulty-terminal"
     data-ft-opts="{'rippleOriginSelector':'#my-logo'}">
</div>
```

---

## TUNING reference

All visual parameters live in the `TUNING` block at the top of the embed file. Copy the output from the debug panel's **⎘ copy values** button and paste it straight in.

### Ripple

| Key | Default | Description |
|-----|---------|-------------|
| `rippleDuration` | `1150` | Main ring travel time (ms) |
| `rippleColorFalloff` | `2.80` | Trail decay curve — higher = shorter, sharper tail |
| `rippleColorAmbient` | `0.52` | Trail colour strength behind the ring (0–1) |
| `rippleColorStrength` | `1.80` | Overall colour intensity multiplier |
| `rippleBrightness` | `0.10` | Glyph brightness boost at the ring front |
| `rippleBrightnessFalloff` | `0.27` | Width of the brightness glow band |
| `mwpColorStrength` | `0.69` | Intensity of the MWP brand palette overlay |
| `rippleFadeOut` | `375` | Duration (ms) to fade trail colour out after the ring completes |

### Aftershock

| Key | Default | Description |
|-----|---------|-------------|
| `aftershockTriggerAt` | `0.82` | Main ripple progress (0–1) at which aftershock launches |
| `aftershockDelay` | `100` | Additional delay (ms) after the trigger point |
| `aftershockDuration` | `850` | Aftershock ring travel time (ms) |
| `aftershockStrength` | `0.30` | Aftershock colour intensity |

### Field

| Key | Default | Description |
|-----|---------|-------------|
| `brightness` | `0.50` | Overall field brightness |
| `glyphGamma` | `1.80` | Glyph contrast curve |
| `scanlineIntensity` | `1.00` | Scanline strength |
| `glitchAmount` | `1.90` | Horizontal glitch displacement |
| `flickerAmount` | `1.10` | Flicker intensity |
| `noiseAmp` | `1.00` | Noise field amplitude |
| `curvature` | `0.23` | CRT barrel distortion (0 = flat) |
| `mouseStrength` | `0.70` | Mouse ripple reactivity |
| `timeScale` | `1.00` | Animation speed multiplier |
| `digitSize` | `1.40` | Glyph scale within each cell |

---

## Structural defaults

These live in the `DEFAULTS` block below `TUNING` and are less commonly changed:

| Key | Default | Description |
|-----|---------|-------------|
| `tint` | `#366777` | Foreground glyph colour |
| `bgColor` | `#2b464e` | Background colour |
| `scale` | `2` | Canvas zoom (1 = pixel-perfect) |
| `mouseReact` | `true` | Enable mouse influence |
| `pageLoadAnimation` | `true` | Fade-in on load (used when ripple is off) |
| `pageLoadDelay` | `1500` | Delay before page load animation starts (ms) |
| `ripple` | `true` | Enable ripple reveal globally |
| `rippleEase` | `true` | Ease-in-out the ripple progress curve |
| `aftershock` | `true` | Enable aftershock globally |
| `debugPanel` | `true` | Show the debug panel — **set to `false` before going live** |
| `targetFPS` | `60` | Target frame rate |
| `autoTune` | `true` | Auto-reduce render resolution to maintain FPS |
| `dpr` | `1` | Device pixel ratio override |

---

## Debug panel

Toggle with the `` ` `` (backtick) key. When multiple `.faulty-terminal` instances are on the page, use **◀ ▶** to switch between them.

- **↺ re-trigger** — replays the ripple reveal
- **⎘ copy values** — copies the current state as a `const TUNING = { ... }` block ready to paste into the embed file

Set `debugPanel: false` in `DEFAULTS` before going to production.

---

## Brand colours

The ripple colour gradient reads CSS custom properties from the document root, falling back to the built-in palette:

| Property | Fallback | Position in gradient |
|----------|----------|----------------------|
| `--raspberry` | `#E84F5C` | Top |
| `--coral` | `#F28745` | Middle |
| `--teal` | `#3DC096` | Bottom |

Define these on `:root` in your Webflow project styles to match your brand.

---

## Performance

`autoTune: true` monitors live frame rate and scales render resolution between `renderScaleMin` (0.28×) and `renderScaleMax` (1×) to stay above the `fpsHigh` target. Rendering pauses automatically when the element scrolls off-screen or the browser tab is hidden.

---

## Browser support

Requires WebGL 1.0. Supported in all modern browsers. Gracefully produces a blank canvas on devices without WebGL.

---

## Credits & licence

Derived from **React Bits** by **David Haz** (MIT + Commons Clause). See [NOTICE.md](./NOTICE.md).
Dependency: [`ogl`](https://github.com/oframe/ogl) (MIT).
