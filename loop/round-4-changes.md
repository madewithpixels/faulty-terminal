Round 4 changes — MWP density/timing controls + heart-stamp reveal wave

New MWP panel section (between RIPPLE FX and FIELD):
  mwpColorStrength (moved from RIPPLE), mwpDensity, mwpFlickerSpeed,
  mwpWaveDuration (JS-only), heartStrength, heartScale, heartFalloff.
TUNING: mwpColorStrength relocated to a new `// mwp` group with the six new
keys (defaults: density 0.15, flicker 1.0, wave 1600ms, heart glow 1.2,
size 1.0, falloff 0.8).

Fragment shader:
- New uniforms: uMwpDensity, uMwpFlicker, uMwpReveal, uMwpWaveEnv,
  uHeartStrength, uHeartScale, uHeartFalloff.
- mwpGate(s, hash): returns 0 before the wave, a hash-staggered radial edge
  (same style as the ripple reveal) while uMwpReveal ramps, 1 after. Early
  returns for the 0 and 1 cases keep idle cost at ~zero.
- heartRowMasks(r) + heartStamp(s): the real madewithpixels heart, sampled
  from NewLogoColourways.psd (9×7, asymmetric tail). Two bit-planes per row
  encode per-pixel colour (code 1 raspberry / 2 teal / 3 coral) — masks ≤511,
  decoded with exp2/floor/mod (mediump-exact). Pixel colours come from the
  existing uRippleColor0/1/2 CSS-var uniforms. Cells outside the bitmap but
  inside the falloff radius (uHeartFalloff, normalized; default ≈3 cells) get
  0.55 strength and a horizontal 3-stop brand gradient. Early radial bail-out
  before any bitmap decode.
- digit(): density threshold step(1.0-uMwpDensity, cellHash) replaces the
  hardcoded 0.85; flicker speed ×uMwpFlicker (0 freezes selection); showChar
  ×mwpGate; while uMwpWaveEnv>0, heartStamp forces showChar on inside the
  stamp and boosts glyph brightness (charPixel×(0.7+stampW·0.8)).
- MWP colour block in main(): same density/flicker/gate (fixing the old
  0.68-vs-0.85 threshold mismatch); heart stamp mixes the heart pixel's colour
  over the M/W/P palette and adds stamp.w·uHeartStrength to the colour mix —
  the requested temporal brightening of MWP colour.

JS:
- New uniforms in Program (uMwpReveal initialises to 1 when ripple:false so
  non-ripple instances behave as before).
- mwpWaveStartTime/mwpWaveDurationRef state; wave launches when the
  aftershock completes ("lands"), or when the main ripple completes if
  aftershock is disabled. uMwpReveal ramps 0→1 over mwpWaveDuration and
  latches; uMwpWaveEnv = fast linear attack (first 10%) then quadratic decay.
- retrigger() resets reveal/env/start time so the full sequence replays.
- setParam/getParam handle mwpWaveDuration.
