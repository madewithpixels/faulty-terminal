# Changelog

## 1.12.1 — pop-out survives reloads

- The debug panel's pop-out (⧉) is now an ordinary popup window, so it stays
  open when the page reloads or you move to another page. The next page with a
  terminal reconnects to it without a click, and in the meantime it shows
  "reconnecting…". Closing the window puts the panel back in the page.
- Shift-click ⧉ for the 1.12.0 behaviour: a Picture-in-Picture window (Chrome,
  Edge) that stays on top of everything but closes on every reload, because
  the browser ties it to the page that opened it.
- Panel only; rendering is unchanged from 1.12.0.

## 1.12.0 — logo timeline in the debug panel

- **Debug panel window.** Dock it left or right at full height, float and drag
  it, or pop it out into its own window (Document Picture-in-Picture in Chrome
  and Edge, so it can sit outside the browser; a popup elsewhere).
  "keep tweaks on reload" remembers values, layout and open state in this
  browser only.
- **Logo resolve timeline in the panel** (from the approved prototype's timeline
  dock): play / pause / reload page, speed, ghost, a scrubbable track with
  field, resolve, degauss and flare lanes and the hand-off and ripple markers,
  and a slider for every timing. Copy values adds a `LOGO` block.
- **The logo timeline is one seekable clock** (`instance.logoTimeline`):
  `play`, `pause`, `seek`, `setSpeed`, `setGhost`, `refresh`.
- **New options, off by default:** `logoFlare` (faulty-terminal hides the logo
  element until the hand-off and flares its pixels), `logoRipple` (fires the
  ripple after the hand-off), `logoPixels`, `logoFlareMs` 350,
  `logoFlareSpread` 500, `logoRippleAt` 60, `logoFlareIntensity` 1.6, `logoFlareBlur` 14 (both in the panel). With both off the site runs the
  flare and ripple, as in 1.11.0.
- Checked frame for frame: with every option off the frames match v1.10.1
  (six scenarios, 0 mismatches), and the default logo path matches v1.11.0
  (0 mismatches over 230 frames, hand-off on the same frame).
- The panel ships hidden and opens with backtick, as before. Panel code
  touches nothing until it is used.

## 1.11.0 — logo resolve

The madewithpixels heart can now resolve out of the terminal field instead of
sitting on top of it: inside the logo's footprint the glyphs lock, light up and
fill into solid pixels on the logo's own grid, the heart takes a damped degauss
wobble with a colour fringe, and the site swaps to its HTML heart on the
hand-off frame. Productised from the approved prototype.

**Everything is off by default. With the new options off the renderer is
v1.10.1's, checked frame for frame** (readPixels hash of every frame in six
scenarios: ripple, fallback, fade, instant + retrigger, `autoTune: false`,
`warmStart: true` — 0 mismatches). The extra shader code is spliced in only
when an option asks for it, so the default shader source is unchanged.

New options (see the README table): `gridLock`, `gridLockCellPx`,
`logoResolve`, `logoPitch`, `logoSize`, `logoPixelsPerCell`, `logoSpread`,
`logoSlot`, `degaussAmp`, `degaussDecay`, the `resolveLogo()` timings
(`logoFieldMs` 500, `logoHoldMs` 250, `logoResolveMs` 1200, `degaussOffset`
−420, `degaussMs` 1550, `logoHandOffset` −140 — the approved 30 Oct 2026
timings), `logoFullScale` and `rippleGate`.

New instance methods: `setFieldProgress`, `setLogoProgress`,
`setDegaussProgress`, `setLogoVisible`, `resolveLogo`, `relayout`,
`holdFullScale`. New event: `faulty-terminal:logo-resolved`.

Notes:

- `rippleGate: false` also stops the reveal front hiding the MWP letters, since
  the field is already showing when the ripple fires.
- With `gridLock` on, the per-glyph brand colour (`brandMode: 3`) follows the
  shifted cells, so a glyph never splits into two colours.
- While the shader heart is showing, the tilt eases to rest so the shader heart
  and the HTML heart line up at the hand-off; the grid layout accounts for the
  tilt's 1.06 scale and the barrel magnification at the logo's centre.
- The full-scale hold recreates the phosphor targets when the scale changes
  (start of the resolve and the hand-off), so the trail restarts at those two
  moments.
- `softwareFallback` instances keep every new method as a no-op; `resolveLogo()`
  still resolves and fires its event (`static: true`) so a site timeline carries
  on. Under `prefers-reduced-motion: reduce` there is no resolve: the field
  shows at once and the event fires with `reducedMotion: true`.
- The existing MWP heart wave (`heartStamp`) still stamps one glyph per heart
  pixel, twice the size of the logo at 2 × 2. `heartScale: 0.5` would match it.
- The pixel stagger keeps the prototype's 4×4 formula as approved; its values
  repeat, so it is not a strict Bayer permutation.

## 1.10.1

- `warmStart` is now **off by default** (opt in with `warmStart: true`). On the
  madewithpixels hero `does-ripple` lands inside the 2s warm window, so the
  start of the reveal rendered at half resolution. PageSpeed was unchanged
  without it — `softwareFallback` is what fixes the Lighthouse run.
- No other behaviour changes. Defaults now: `softwareFallback: true`,
  `deferLoop: true`, `warmStart: false`.

## 1.10.0 — paint-safe start

Keeps the terminal out of the way of the page's first paint on software WebGL
(Lighthouse / PageSpeed, Googlebot) and slow CPUs. No visual change on devices
with a GPU once the warm-start window has passed; public API unchanged.

Three new options, all on by default. **Each one set to `false` restores the
exact v1.9.1 behaviour for that part** (checked frame for frame against v1.9.1):

| Option | Default | Off value | What it does |
|---|---|---|---|
| `softwareFallback` | `true` | `false` | Software WebGL (SwiftShader, llvmpipe, softpipe, "software", Microsoft Basic Render) or no WebGL context: no renderer and no render loop. The container keeps its painted background and gets `.ft-static`. `faulty-terminal:ready` still fires, with `detail.static = true`. `console.info` once per page. |
| `deferLoop` | `true` | `false` | While the ripple reveal is armed, draw one frame (so `ready` fires as before), then hold the rAF loop until `does-ripple`, the `revealFallback` timer or `retrigger()`. `reveal: 'fade'` / `'instant'` start at once, as before. |
| `warmStart` | `true` | `false` | For the first `warmStartMs` of page life, render at `max(renderScaleMin, 0.5)` and ≤30fps. A first measurement window below `fpsLow` drops straight to `renderScaleMin`. At the end, if the device held 30fps, it goes straight back to full scale. Otherwise `autoTune` carries on as before. |
| `warmStartMs` | `2000` | — | Length of the warm-start window (ms). |

Switch everything off from the site without a rollback:

```js
window.FaultyTerminalConfig = { softwareFallback: false, deferLoop: false, warmStart: false };
```

The options also work per element through `data-ft-opts`, the config template, or
`data-ft-software-fallback="false"`, `data-ft-defer-loop="false"`, and
`data-ft-warm-start="false"`.

Notes:

- Phosphor render targets are **not** deferred until warm-up ends. Creating them
  later would drop the phosphor trail for the ring's first frames. That is a
  visible change during the reveal. Their cost already scales with render
  scale, so warm start cuts it by about 4×.
- The static instance has the same shape as a live one (`ctn`, `opts`,
  `setParam`, `getParam`, `retrigger`, `ready`, `hasRipple: false`), plus
  `static: true`.

## 1.9.1

`reveal: 'fade'` starts at once, with a 1500ms build-up.

## 1.9.0

Added the `reveal` setting, a configurable load fade, and the ready event.
