# Changelog

## 1.13.4 — tuned lift-resolve defaults

- The lift resolve now ships with the tuned timings: the heart forms mid-field (`logoOrigin: 'centre'`)
  and glides to the HTML heart, with a longer pin (1300ms) and lift hold (860ms), a tight M → W → P
  stagger (10ms, 39ms per row), a quicker glide (350ms) and an earlier, longer degauss
  (-1500ms, 3010ms, purity 0.8). Field fade-in 410ms.
- `LIFT_DEFAULTS` now carries every lift option, so the debug panel's reset returns to exactly these values.
- TUNING unchanged. `cellPx` stays 0 in the library: on the site the footer snippet sets it from the
  "FT cell size" Webflow variable.

## 1.13.3 — start after every deferred script

- faulty-terminal now also waits for DOMContentLoaded when it runs as a deferred
  script, so a deferred page script after it in the document (the Home lift
  wiring sets `data-ft-logo-lift`) is always in place before it starts. Moving
  the loader tag from a registered script into the site footer put it before
  the page's own footer code, and the lift resolve didn't start.

## 1.13.2 — cell size from CSS (Webflow variables)

- `cellPx` also takes a CSS value: `'22px'`, `'1.4rem'`, `'clamp(…)'` or
  `'var(--name)'`. It is measured with a hidden element in the container and
  re-read on every resize, so a Webflow Size variable whose modes follow the
  breakpoints sets the cell size per breakpoint with no code. Works from
  `data-ft-cell-px` too. If the value doesn't resolve, the cells fall back to
  1.13.1's square cells from `scale` (one console warning).
- The debug panel shows the measured size for a CSS `cellPx` and copy values
  keeps it as written. API: `instance.cellSize` (the size in px now).

## 1.13.1 — square cells

- **Cells are square on every screen shape.** The field had a fixed 2:1 grid
  (`gridMul: [2, 1]`), so cells were only square on a 2:1 screen: 1.25× taller
  than wide on a 16:10 laptop, 2.7× on a portrait tablet and 4.4× on a phone in
  portrait (440 × 956). The lift resolve forms the heart from those cells, so on
  phones it started stretched; the field's glyphs were stretched too. Now the
  columns still come from `scale` × `gridMul[0]` and the rows follow the
  screen's shape. On a 2:1 desktop this is a sub-1% change.
- **`cellPx`**: a cell size in CSS px, the same on every screen. Set it per
  breakpoint (e.g. `setParam('cellPx', 22)` below 768px) for exact sizes; 0 (the
  default) keeps the scale-based columns. `scale` still sets the size of the
  field's noise pattern.
- `squareCells: false` restores the 1.13.0 grid. `setParam('scale' | 'cellPx')`
  now regrids live (the site's breakpoint script calls `setParam('scale')`).

## 1.13.0 — lift resolve, overscan, ripple shape and colour, pulse

- **Lift resolve** (`logoLift: '<selector of the HTML heart>'`). The heart forms
  from the field's own cells: they decode into their M / W / P letters and fill
  solid; each pixel then lifts off the glass (raspberry, coral, teal in turn, a
  row at a time), leaving its phosphor ghost, and glides onto its HTML pixel. The
  HTML heart takes over on a frame where the two are identical (no flare). The
  degauss shakes the glass and blots its colour purity during the lift; lifted
  pixels are spared. `logoOrigin`: `'target'` forms beside the HTML heart,
  `'centre'` mid-field. Flat start (`logoCurveRamp`): the glass is flat while the
  heart forms and curves on its own lane. Timings: `logoPinMs`, `logoLiftHoldMs`,
  `logoLiftMs`, `logoStaggerMs`, `logoRowStagger`, `logoTravelMs`, `logoCurve*`;
  look: `logoDepth`, `logoBloom`, `logoQuiet`, `degaussPurity`. The timings it
  shares with the v1.11 resolve (`logoFieldMs`, `logoHoldMs`, `degauss*`,
  `logoRippleAt`) take lift-specific defaults only when `logoLift` is set, so a
  page still on `logoResolve` keeps its approved timings. `resolveLogo()` plays
  it; `liftTimeline` is the seekable clock. Demo: `demo/lift.html`.
- **Overscan** (`overscan: 'auto'`, now the default). The canvas is drawn larger
  than its container, just enough to cover the maximum tilt, so the canvas edge
  never shows and `vignette` sits on the visible area. Glyph pitch is unchanged.
  Costs ~30% more pixels on wide screens. `overscan: false` = v1.12.
- **Ripple shape**: donut ring (`rippleRingWidth`, `rippleEdgeSoft` outer edge,
  `rippleInnerFalloff` inner edge), `rippleAspect` (ellipse), `rippleWobbleFreq`,
  `rippleGlass` (colour on the slate between glyphs), `rippleHotCore`, echo rings
  (`rippleEchoes`, `rippleEchoGap`, `rippleEchoDecay`), `rippleReach`,
  `rippleCurve` (speed curve). The aftershock gets its own `aftershockReach`,
  `aftershockWidth`, `aftershockTrail`, `aftershockColorShift`.
- **Ripple colour**: `rippleColorMode` (vertical, horizontal, radial bands,
  around origin, over time, per glyph), `rippleColorScale`, `rippleColorOffset`,
  `rippleColorSpin`, `rippleColorBlend`. Every new ripple option at 0/1 draws the
  v1.12 ring.
- **Pulse** (`pulsePeak`, off by default): on the ripple impact the field ramps to
  the peak values and settles back (`pulseAttackMs`, `pulseHoldMs`,
  `pulseDecayMs`, `rasterBloom`).
- **Debug panel**: lift timeline with draggable lanes (move / resize / ripple
  line), editing *rest* or *pulse peak*, collapsible sections, a help line for
  every control, `chromaticAberration` / `dither` / `overscanMargin` sliders, and
  copy values exports `pulsePeak` and a `LIFT` block.
- New defaults (Michael, 25 Nov 2026): see `TUNING` and `LIFT_DEFAULTS`.

## Site wiring: FTLogoResolveFooter 1.13.0 (25 November 2026)

- Home switches from the grid-lock resolve + flare to the lift resolve: the
  script sets `data-ft-logo-lift` and `data-ft-origin` to `.mwp-logo` and nothing
  else, so the timings are the engine defaults and tweakable from the panel. The
  head script is unchanged. Needs faulty-terminal 1.13.0.

## 1.12.3 — new tuning defaults

- Baked `TUNING` and `LOGO` defaults updated to the values approved on 19 Nov 2026
  (ripple, aftershock, MWP, brand, field and the logo-resolve timeline). They
  replace the logo-resolve defaults set in 1.12.1. No new options, no API changes.
  Set any value through `FaultyTerminalConfig` / `data-ft-*` to keep the 1.12.2 look.
- Includes everything on `fix/safari-first-run-stutter` (1.12.1 pop-out and logo
  fixes, 1.12.2 first-run smoothing). The 1.12.3 site-wiring note below is a
  separate version number: `FTLogoResolveFooter`, not this package.
- The `v1.12.1` tag on `main` is the defaults-only build without those changes.
  Don't use it on the sites.

## Site wiring: FTLogoResolveFooter 1.12.3 (4 November 2026)

- The Home page heart now starts once the page has loaded (capped at 2.5s), in
  every browser. As the page becomes ready, Webflow builds its scroll
  interactions: about half a second of solid work in Safari, so when the heart
  was already playing it froze, most visibly at the start of the resolve.
  `WAIT_FOR_LOAD` at the top of `webflow/home-logo-resolve-footer.js`: `'all'`,
  `'safari'` or `'off'`.

## 1.12.2 — smoother first run in Safari

- **The full-scale hold no longer lands mid-animation.** With the logo resolve
  on, the switch to full render scale used to happen at the start of the
  resolve (and back at the hand-off), resizing the canvas and rebuilding the
  phosphor buffers on a visible frame. It now happens when the timeline starts,
  while the field is still invisible, and is released once the ripple has faded.
- **First-run warm-up.** On the first play, one offscreen draw with the logo
  mid-resolve and mid-degauss lets the browser do its first-use work before
  anything is on screen; the logo element's pixels and colours are read then
  too, not on the hand-off frame. Safari stalled for a frame the first time the
  resolve and the degauss ran (never on replays).
- **No reallocation at the same size.** Setting the canvas to the size it
  already has is now a no-op; before, it reallocated the canvas and three
  full-size render targets.
- **Render targets are freed.** Old phosphor targets were never deleted, so
  every size change leaked three full-size textures.
- **Frame cap slack.** `targetFPS` now allows 2ms of slack (as the warm start
  already did), so a frame that arrives a hair early is no longer skipped (a
  dropped frame at 60Hz, and 40fps instead of 60 at 120Hz).
- Debug panel: scrubbing back into the timeline takes the full-scale hold
  again; scrubbing to the end releases it.

## 1.12.1 — pop-out survives reloads

- The debug panel's pop-out (⧉) is now an ordinary popup window, so it stays
  open when the page reloads or you move to another page. The next page with a
  terminal reconnects to it without a click, and in the meantime it shows
  "reconnecting…". Closing the window puts the panel back in the page.
- Shift-click ⧉ for the 1.12.0 behaviour: a Picture-in-Picture window (Chrome,
  Edge) that stays on top of everything but closes on every reload, because
  the browser ties it to the page that opened it.
- **New logo resolve defaults** (tuned in the panel, 30 Oct 2026): a much
  quicker resolve. Field fade-in 550, hold 0, resolve 400, pixel stagger 0.31,
  degauss vs fill −70, degauss length 380, degauss amp 2, degauss settle 6.5,
  hand-off vs end −140 (as before), flare stagger 220, flare intensity 0.65,
  flare blur 22, ripple 30 ms after the hand-off. Hand-off now lands about
  1.1 s after `resolveLogo()` (was 2.9 s).
- **Copy values works when the panel is popped out.** It now copies from the
  window that holds the panel (with a fallback), and says so when it can't.
- Wider ranges for the resolve (from 100 ms) and degauss amp (up to 4).
- With the logo options off, frames are unchanged from 1.12.0.

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
