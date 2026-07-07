Round 2 critique — the idle field is flat between events

(a) Weakness
Once the ripple settles, the field runs on scanlines + flicker + 2-octave fbm
alone. Three production-value gaps versus a real CRT:
1. Uniform luminance edge-to-edge. Real tubes fall off toward the corners;
   the flat field makes the canvas read as a texture fill, especially full-bleed
   behind the hero.
2. No slow-timescale event. Everything in the idle field cycles at sub-second
   periods (flicker, scanline bar, glitch windows). There is nothing on a
   10–20s timescale, so after a few seconds the eye files it as a loop. A slow
   vertical retrace sweep — the classic bright refresh band crawling down a
   CRT — gives the field a long-period heartbeat.
3. fbm() has only 2 octaves (a listed known weakness). The intensity field that
   decides which dots are lit is visibly smooth/blobby; a third octave adds
   fine-grain structure so clusters of lit dots get more articulated borders.

(b) Proposed change
Three field FX in a new FIELD FX panel section, each a strength slider where
0 = off:
- vignette / uVignette: radial darkening in screen space (vUv, pre-barrel so it
  stays frame-aligned), applied to the final colour. Max ~35% at the corners.
- retraceSweep / uSweep: a gaussian band drifting down the (post-barrel) uv
  every ~20s that multiplies up the glyph `blend` term — it brightens lit dots
  only, never the background, respecting aim #2 (colour/light lives inside the
  glyphs). Following the barrelled uv means the sweep bows with the tube
  curvature, which sells the CRT read.
- noiseDetail / uNoiseDetail: blends in a third fbm octave (continuing the
  existing 0.4545 amplitude decay and ×2 lacunarity).

(c) Risks / regressions
- fbm is the hot path: pattern() calls fbm 5×, digit() calls pattern once, and
  digit runs 5×/pixel → +25 noise() calls/pixel worst case. Mitigation: the
  octave is inside `if(uNoiseDetail > 0.001)` so the slider at 0 restores
  exactly the old cost; noise() is two sins; autoTune absorbs the rest on weak
  GPUs. Default 0.6 keeps amplitude small (≤0.062·uNoiseAmp).
- A third octave shifts the intensity distribution slightly upward → marginally
  more lit dots. Amplitude is small enough that brightness/glyphGamma sliders
  cover any retune.
- Sweep modulates `blend`, which is also the mix weight for ripple screen
  colour — a passing sweep slightly intensifies ripple colour in its band.
  Judged acceptable (they're both "energy in the tube") and it avoids adding a
  second blend variable.
- Vignette multiplies final col including the ripple colour — correct: a tube's
  corner falloff attenuates everything.
