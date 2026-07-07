# faulty-terminal — Agent Brief & Improvement Loop

This document is written for an AI agent running an autonomous improvement loop on `faulty-terminal.embed.html`. Read it fully before touching any code.

---

## What this is

`faulty-terminal` is a WebGL dot-matrix terminal effect delivered as a **single self-contained HTML embed file**. It is pasted into a Webflow custom code block and auto-initialises on every `.faulty-terminal` div on the page. There is no build step, no bundler, no framework. The entire effect — shader, JS runtime, debug panel, performance management — lives in one file.

The visual effect is a field of glowing dots arranged in a 5×5 glyph sub-grid, rendered through a WebGL fragment shader. The field has: scanlines, CRT barrel distortion, glitch displacement, per-cell flicker, fbm noise patterns, and mouse reactivity. Three brand characters (M, W, P) are injected into random cells at low opacity. The overall palette is dark teal (`#2b464e` background, `#366777` glyph tint) with a three-stop brand colour gradient: raspberry → coral → teal.

### The ripple reveal

The core interaction is a **circular ripple reveal** — when the class `does-ripple` is added to a `.faulty-terminal` container (via Webflow interaction), a ring sweeps outward from an origin point. As it passes, it reveals the glyph field from darkness using a staggered per-cell hash so cells emerge in a scattered, organic way rather than a clean disc edge.

The ripple system has three phases:
1. **Main ring** — bright colour glow at the wave front, decaying colour trail behind it
2. **Fade-out** — after the ring completes, the trail colour dissolves over `rippleFadeOut` ms rather than cutting hard
3. **Aftershock** — a secondary ring fires at a configurable point mid-ripple (`aftershockTriggerAt`), arriving slightly after or overlapping the main ring's completion

The colour is applied via **screen blend** against the glyph field — this is deliberate and load-bearing. Screen blend means colour only appears on lit glyph dots, never on the dark background between them. The effect is that the brand colours live *inside* the dots rather than floating on top. Do not change this blend mode.

### Tilt

A subtle CSS 3D perspective tilt is applied to the canvas based on mouse position (desktop) or gyroscope (mobile). The canvas is rendered at `scale(1.06)` to provide bleed at the edges so tilting doesn't reveal the page behind. On iOS the gyroscope requires permission; a one-time tap handler on the container requests it silently.

---

## Aims

1. **Feel like a real terminal.** Scan lines, flicker, glitch, barrel distortion, and the dot-matrix glyph structure should read as a physical CRT screen, not a CSS animation.

2. **Colour lives inside the glyphs.** The ripple reveal should feel like the brand colours are illuminating from within each dot, not washing over the surface. This is the key aesthetic constraint.

3. **Zero visible disc.** The ripple ring should never look like a shape overlaid on the terminal. It should read as a property of the glyph field itself — brightness and colour shifting as the ring passes.

4. **One file.** The entire effect must remain in `faulty-terminal.embed.html`. No external dependencies except `ogl` loaded from esm.sh CDN. No separate CSS file, no separate JS module.

5. **Work on phones.** The adaptive resolution system (`autoTune`, `renderScaleMin/Max`, `maxPixels`) must be respected. Rendering pauses off-screen and in background tabs.

6. **Debug panel is production-ready.** The panel is a genuine tool used in live iteration sessions. It must remain single-instance (one panel for all terminals, toggled with `◀ ▶`), toggled with backtick, and the copy button must output valid `const TUNING = { ... }` blocks that can be pasted straight into the file.

---

## How it interacts with the GSAP pixel heart animation

On the madewithpixels hero, there is a separate GSAP animation — a pixel-art heart that assembles itself from individual dot elements on page load. The two animations share a visual language (dot/pixel grid aesthetic) but are implemented independently.

The connection is:
- **Timing**: the GSAP heart animation completes its assembly, then a Webflow interaction triggers the `does-ripple` class on the faulty-terminal below it. The ripple reveal is the handoff moment — the heart finishes building, and the terminal field wakes up around it.
- **Origin point**: `rippleOriginSelector` points at the hero logo/heart element so the ripple expands from the heart's centre, making it feel like the heart is the source of the reveal energy.
- **Colour palette**: both animations use the same three-colour brand palette (raspberry, coral, teal defined as CSS custom properties `--raspberry`, `--coral`, `--teal`). The terminal reads these at initialisation time.
- **Z-layering**: the heart animation sits above the terminal (higher z-index). The terminal is a full-bleed background. They don't interact at the DOM or JS level — purely visual layering.

The aftershock was added specifically to complement this — the secondary ring gives a "reverberation" feeling after the main reveal, suggesting the heart's energy is still dissipating into the field.

---

## Architecture constraints the agent must respect

### Shader constraints
- GLSL ES **1.0** only. No `textureLod`, no `dFdx`/`dFdy`, no integer types, no `flat` interpolation. `mediump float` throughout.
- The `digit()` function is called **5 times per pixel** in `getColor()` — once for the centre sample and four for edge anti-aliasing. Any code added inside `digit()` runs 5× per pixel per frame. Keep it cheap.
- `hash21()` is the sole noise primitive. It is fast but not high-quality. Use it for visual randomness, not cryptographic-style distribution.
- The `pattern()` / `fbm()` system generates the underlying glyph intensity field. It is expensive. Changes here have a large performance cost.

### JS constraints
- **Single file.** Everything is a module-level const or function. No classes.
- **`TUNING` → `DEFAULTS`** is the only way to change visual defaults. `TUNING` contains all tuneable numeric parameters. `DEFAULTS` spreads `TUNING` and adds structural/boolean params. The copy exporter reconstructs `TUNING` from the current slider state.
- **`SLIDERS`** is a module-level array that drives both the debug panel UI and the `unifMap` inside each instance. Adding a new shader uniform requires: (a) the uniform in the GLSL, (b) an entry in the `Program` uniforms object, (c) an entry in `SLIDERS` if it should be panel-controllable.
- **`SLIDERS` format:** `[key, uniformName|null, label, min, max, step, section, type?]`. If `uniformName` is null, the param is JS-only (handled in `setParam`/`getParam`). If `type` is `'bool'`, the panel renders a checkbox instead of a range slider.
- **`createInstance()`** returns `{ ctn, opts, setParam, getParam, retrigger, hasRipple }`. Any new controllable behaviour needs to be gettable and settable through these.
- **Webflow data attribute constraint:** single-quoted JSON only in `data-ft-opts`. No double quotes. The parser swaps single→double before `JSON.parse`.

### Do not change
- The screen blend formula: `screened = 1.0 - (1.0 - col) * (1.0 - flashCol * totalStr)`
- The `IntersectionObserver` / `visibilitychange` pause logic
- The single-panel architecture in `buildDebugPanel()`
- The `rippleStartTime` reset in `start()` (prevents instant-complete for below-fold instances)

---

## Known weaknesses / areas open for improvement

These are genuine open problems, not just polish:

- **Trail gap at mid-progress:** `colorAge = dist / radius` means at the ring front, `1 - colorAge = 0` always, so the trail always mathematically drops to zero where the ring begins. The `clamp(ringStr + trailStr)` addition bridges this, but a more elegant parametric envelope would be cleaner.
- **Glyph AA is cheap:** the 4-sample offset anti-aliasing in `getColor()` is a rough approximation. Better AA would improve glyph crispness especially at small `digitSize` values.
- **No wave shape variation:** the ripple is purely radial distance-based. A subtle wave function on the ring front (slight wobble, asymmetric falloff) would make it feel more organic.
- **The MWP character injection is purely random:** cells that show M, W, or P are chosen by hash. A more intentional layout (e.g., spell something across the field) could be interesting.
- **`fbm()` only has 2 octaves:** adding a third octave would enrich the noise field at low cost.
- **No touch equivalent for mouse reactivity:** `mousemove` has no touch counterpart, so mobile users get no mouse-reactivity parallax (the gyro tilt partially compensates).

---

## Loop instructions

You are running in a self-improvement loop. Each iteration must follow this protocol exactly.

### Before any changes
1. Read `faulty-terminal.embed.html` in full.
2. Read this file (`AGENT_BRIEF.md`) in full.
3. Write a plain-text critique of the current state to `loop/round-N-critique.md` (create the `loop/` directory if it doesn't exist). The critique must cover: (a) one specific visual or technical weakness you have identified, (b) your proposed change and the reasoning, (c) any risks or regressions the change might introduce.

### Making changes
4. Copy the current `faulty-terminal.embed.html` to `loop/round-N-before.html` before touching it.
5. Make **one focused change** per round. Do not refactor unrelated code. Do not change `TUNING` values unless the change specifically requires it.
6. After editing, write a brief change log to `loop/round-N-changes.md`: what changed, what file/line, why.

### Self-review
7. Re-read the changed sections of the file.
8. Check: does the change respect all constraints in "Architecture constraints the agent must respect" above?
9. Check: does the change work with GLSL ES 1.0 mediump if it touches the shader?
10. Check: does the change break the debug panel copy output format?
11. Write a pass/fail verdict and one-sentence reasoning to `loop/round-N-verdict.md`. If fail, revert to the before state and document why in the verdict file.

### Handing off to the next round
12. Increment N and begin again from step 1.
13. Use the critique and verdict from prior rounds to avoid repeating the same changes. Read all existing `loop/` files at the start of each round.

### What counts as a good change
- Improves a specific identified weakness without introducing new ones
- Stays within the single-file, GLSL ES 1.0, no-build-step constraints
- Passes the self-review checks
- Would be legible and useful to a human developer reading the diff

### What to avoid
- Cosmetic reformatting of unrelated code
- Changing `TUNING` defaults without a specific reason tied to the improvement
- Adding new dependencies or CDN imports beyond `ogl`
- Refactoring working code for style preferences alone
- Changes to the screen blend formula, the pause/resume logic, or the single-panel architecture
