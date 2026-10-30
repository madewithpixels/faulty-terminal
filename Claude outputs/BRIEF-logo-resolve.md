# Brief: logo resolve — the MWP heart condenses out of the field (faulty-terminal v1.11.0)

## Goal
On the madewithpixels hero, the pixel heart logo should resolve out of the terminal field rather than sit on top of it. Inside the heart's footprint the field's glyphs lock, light fully and fill into solid pixels on the heart's own even grid; the whole heart then takes a damped degauss wobble with a colour fringe. As it settles, the site swaps to the HTML heart in the same frame, plays a phosphor flare on it, and fires the ripple from the heart.

Michael approved the look and every timing below from a working prototype ("Heart Resolve Prototype" artifact, with a timeline panel). The prototype's shader changes are in `Claude outputs/heart-resolve-prototype.patch` (applies cleanly to v1.10.1 `src/faulty-terminal.js`). Treat the patch as the reference for the look and productise it as below.

"Glyph" in this brief means one whole field cell (the scanlined block), as Michael uses the word.

## What lives where
- **FT (this brief):** the resolve stages and the degauss, drawn inside the existing fragment shader (`logoPass()` after the MWP overlay, before vignette); grid lock; a ripple that pulses without hiding the field; progress uniforms and a small API.
- **Site (Claude does this afterwards):** the HTML heart (sized in whole device pixels), the timeline that drives FT's progress values, the phosphor flare on the HTML pixels, and the `retrigger()` call for the ripple.

## Geometry (measured on staging, iiyama ultrawide, 2044×1132, DPR 1)
- The field always has `scale × gridMul × 15` cells across the canvas: 60 × 30 by default, whatever the window shape, so cells are not square (about 36 × 40px there).
- The HTML heart (`.mwp-logo`) is 9 × 7 cells of 16px with 2px gaps (pitch 18px), 3px radius. Colours: `--raspberry #d9466c`, `--coral #ef8965`, `--teal #37907f`.
- Approved option: one glyph = 2 × 2 logo pixels, so 36 × 36px cells. Inside a glyph the dot matrix occupies the left 80% and bottom 80% (gap top and right), so the cell's top-left sits at the heart's top-left minus one gap in y.
- At browser zooms other than 100% the site sizes the heart in whole device pixels (e.g. 14 + 2 device px at 90%). Pitch and size therefore come from the site as uniforms, never hard-coded 18/16.
- Barrel curvature (0.3) is under 1px at the screen centre; no curvature treatment for the logo.

## What to build

### 1. Grid lock (options, off by default)
- `gridLock: null | selector`. When set:
  - `gridLockCellPx`: the cell size in CSS px (site passes 2 × logo pitch). `gridMul` is derived from the container size so cells are square at that size, divided by the barrel magnification at the element's centre (see the prototype page's `layout()`).
  - `uGridShift` so a cell edge lands on (element left, element top − gap). Applied in `digit()` and the MWP-letter overlay (both sample the same shifted `p`).
  - Recomputed on resize and whenever the site moves or resizes the element (expose `relayout()`).
- Off = exactly v1.10.1 behaviour.

### 2. Logo resolve (options, off by default)
Uniforms (prototype names): `uLogoOn`, `uLogoP` (resolve progress 0→1), `uLogoD` (degauss progress 0→1, its own clock), `uLogoPPC` (2), `uLogoOrigin`, `uLogoCellPx`, `uLogoPitch`, `uLogoSize`, `uLogoSpread`, `uDegAmp`, `uDegDecay`, `uSlotScale`. Default mask = the MWP heart already in the shader (`heartRowMasks`).

Stages (prototype `logoPass()`):
- **Per-pixel resolve, driven by `uLogoP`.** Each pixel starts after a delay `d = bayer4(col,row) × spread + small hash`, then runs over q = 0→1:
  - 0–0.20 lock: crossfade from the live field to a steady copy of the glyph.
  - 0.15–0.55 switch on: dot lit fraction 35% → 100%.
  - 0.50–0.90 fill: each dot's vertical brightness ramp (the scanline look) flattens to solid.
  - 0.30–1.00 colour: dim tint → exact brand colour.
  - **Even grid throughout:** from the lock onward each heart pixel is drawn in its own slot on the logo grid (same centre and pitch as the final pixel, scaled by `uSlotScale`), showing a 3 × 3 matrix of field-sized dots. Quarters of a glyph that are not heart pixels keep the field's 5 × 5 dots and fade to background as their neighbours resolve.
- **Degauss, driven by `uLogoD` (global, not per pixel):**
  - Damped size wobble from slot to full pixel: `morph = 1 − e^(−1.5·decay·t) · mix(1, cos(4.5πt), amp) · (1 − t)`, overshooting beyond 1.
  - A wave rolls down the rows (x offset `sin(1.7·row − 26t) × env × 3px`, y offset `sin(1.3·col + 19t) × env × 1.5px`), with `env = e^(−decay·t)(1 − t) × amp`.
  - Colour fringe: red and blue coverage offset by `(cos 31t, sin 23t) × env × 4px`.
  - Purity shift: each brand colour leans toward a neighbour brand colour by `sin(17t + 0.6·col) × env × 0.9`.
  - Corner radius grows to 3px as it settles.

API on the instance:
- `setLogoProgress(p)`, `setDegaussProgress(d)` for a site-driven timeline (this is how the site will use it).
- `resolveLogo(timings) → Promise` as a convenience that runs the whole FT side with the timings below and resolves on the hand-off frame; also fires `faulty-terminal:logo-resolved` on the container.
- `setLogoVisible(false)` for the hand-off.

### 3. Ripple that pulses without hiding the field
- Option `rippleGate` (default `true` = today). `false`: ring brightness, colour and warp as now, but no multiplication by the reveal front (`loadFactor`). Needed because the field is already visible when the ripple fires.

### 4. Field fade without the ripple
- With the logo resolve on, the field fades in through the existing per-cell page-load path, driven by the site's timeline (`uPageLoadProgress` 0→1 over `fieldMs`), not by the ripple. Expose `setFieldProgress(p)` or equivalent.

## Approved timings (Michael, 30 Oct 2026) — make these the defaults
| Key | Value | Meaning |
|---|---|---|
| fieldMs | 500 | field fade-in |
| holdMs | 250 | hold before the resolve starts |
| resolveMs | 1200 | `uLogoP` 0→1 |
| spread | 0.41 | pixel stagger (Bayer spread of the resolve) |
| degOffset | −420 | degauss starts 420ms before the resolve ends |
| degMs | 1550 | `uLogoD` 0→1 |
| degAmp | 1.8 | degauss strength |
| degDecay | 11 | degauss settle speed |
| slot | 0.53 | pixel size before the degauss (fraction of final) |
| handOffset | −140 | hand-off + flare start 140ms before the degauss ends |
| flareMs | 350 | phosphor flare length (site side) |
| flareSpread | 500 | flare stagger across pixels, Bayer order (site side) |
| rippleAt | 60 | ripple fires 60ms after the flare starts (site side) |

Schedule: field 0→500; resolve 750→1950; degauss 1530→3080; hand-off/flare 2940; ripple 3000.

## The flare (site side, for reference)
Each HTML pixel overexposes (brightness up to ×2.6 with a glow in its own colour up to 14px) and decays exponentially (e^(−t·flareMs/180) over the flare), started in 4×4 Bayer order across `flareSpread`. FT only needs to accept `setLogoVisible(false)` on the hand-off frame and `retrigger()` with `rippleGate: false` straight after.

## Constraints
- Paint-safe start stays intact: nothing here runs before first paint; software WebGL (`softwareFallback`) skips it, and the site keeps the HTML heart as the fallback.
- Reduced motion: no resolve; the field shows and the logo is simply there.
- Render at full scale (renderScale 1, autoTune paused) from the start of the resolve until the hand-off, then let autoTune resume. At ~65% the shader heart's columns and rows came out uneven. The prototype runs at full scale throughout and holds 60fps on Michael's machine.
- Phosphor persistence leaves a ~560ms afterglow of the shader heart after the hand-off. With the flare on top it read fine in the prototype; if it ever shows as a double, clear the logo region from the phosphor buffer on hand-off.
- Every new option off must reproduce v1.10.1 frame for frame.

## Known interaction
The existing MWP heart wave (`heartStamp`, `heartScale` 1) stamps a heart at one glyph per heart pixel: twice the size of the logo with 2 × 2. Leave it unless Michael asks; note in the changelog that `heartScale: 0.5` would match the logo.

## Deliverables
- v1.11.0 build (dist + embed + loader SRI), CHANGELOG entry, README options table.
- A short "site wiring" note: config the site needs (`gridLock: '.mwp-logo'`, logo resolve on, `rippleGate: false`, full-scale-during-resolve), the progress setters, and the event. Claude will do the Webflow side from that note.
