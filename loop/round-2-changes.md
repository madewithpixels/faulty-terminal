Round 2 changes — field cinematics FX (vignette, retrace sweep, noise detail)

All three are strength sliders in a new FIELD FX panel section; 0 = off and
restores the exact pre-change per-pixel cost (uniform-gated branches).

1. TUNING: added `vignette: 0.30`, `retraceSweep: 0.50`, `noiseDetail: 0.60`
   under a `// field fx` comment.

2. SLIDERS: three new entries after tiltStrength, section 'FIELD FX':
   vignette→uVignette (0–1), retraceSweep→uSweep (0–1),
   noiseDetail→uNoiseDetail (0–1). Uniform-backed, so setParam/getParam work
   through the existing unifMap.

3. Fragment shader:
   - New uniforms uVignette, uSweep, uNoiseDetail.
   - fbm(): optional third octave — continues the existing progression
     (p = m1*p*2.0, amplitude ×0.454545), scaled by uNoiseDetail. Inside a
     zero-check branch because fbm is the hot path (≤25 calls/pixel via
     pattern()×digit()×AA).
   - main(): retrace sweep between the blend computation and the
     mix(uBgColor, uTint, blend) — a gaussian band (exp(-d²·250)) crawling
     down post-barrel uv over a 20s period (iTime·0.05), sweeping from just
     above the frame (1.1) to just below (-0.2). It scales `blend`
     multiplicatively (blend + blend·band·strength·0.9) so unlit background
     pixels stay unlit — light stays inside the glyphs.
   - main(): vignette just before the dither line — col ×= 1 − |vUv−0.5|²·
     uVignette·1.3. Uses vUv (pre-barrel) so the falloff stays frame-aligned;
     max corner attenuation ≈33% at slider 1.0. Placed after MWP tint so it
     attenuates everything, like a real tube.

4. Program uniforms: three new entries with opts.* ??0 fallbacks.

Why: idle field had no corner falloff, no long-period motion, and a blobby
2-octave intensity field; see round-2-critique.md.
