Round 1 critique — ripple lacks physicality

(a) Weakness
The ripple is purely radial-distance-based (a known weakness in the brief: "No wave
shape variation"). Three symptoms:
1. The ring front is a mathematically perfect circle. Even with the per-cell reveal
   hash scattering the edge, the colour ring and glow band trace an exact disc,
   which subtly violates aim #3 (zero visible disc) — perfection is what makes it
   read as an overlay rather than a property of the field.
2. The wave has no physical effect on the glyphs it passes through. A real
   shockwave in a medium displaces the medium. Here dots light up but never move,
   so the ripple reads as a lighting cue, not an energy transfer from the heart.
3. The moment of impact (ripple trigger) has no punch. The field goes from idle to
   ring-expanding with no transient — no shudder, no glitch spike. For a "terminal
   waking up" beat, the first 300ms is where the wow factor lives.

(b) Proposed change
Add three independently tuneable, zero-defaultable ripple FX, all panel-controlled
under a new RIPPLE FX section (slider value 0 = effect fully off):
- rippleWobble / uRippleWobble: perturb the ring radius by two low-frequency
  angular sinusoids (shared ringWobble() helper so the reveal edge in digit(),
  the colour ring, the aftershock and the warp all agree). Breaks the perfect
  circle organically.
- rippleWarp / uRippleWarp: radial refraction — displace the sampling uv toward
  the origin in a narrow band at the wave front (and a weaker one at the
  aftershock front), so glyphs physically bow as the wave passes.
- impactBurst / uImpactBurst: row-tear glitch jitter during the first 30% of
  ripple progress, decaying quadratically — the field shudders on impact, then
  settles. Computed entirely in-shader from uRippleProgress, so it replays
  correctly on retrigger with zero JS state.

(c) Risks / regressions
- atan() in ringWobble runs up to 5×/pixel while a ripple is active (digit() is
  called 5× in getColor). Mitigation: entire wobble term is inside existing
  `if (uRippleActive > 0.5)` branches and multiplies by a uniform that can be 0;
  atan on mediump is cheap on modern mobile GPUs; ripple is active ~1.5s total.
- Warp displaces uv before getColor, which also shifts the barrel-distorted
  sampling. Displacement is capped at 2% of uv-space at slider max — the canvas's
  1.06 bleed absorbs the shift at edges.
- Wobble applied to radius must match between reveal (digit) and colour (main)
  or the colour ring detaches from the reveal edge — solved by the shared helper
  using identical constants.
- atan(0,0) at the exact origin: epsilon added to x to avoid undefined result.
- New keys must be in TUNING or the panel copy exporter output would no longer
  paste back cleanly — they are added to TUNING with tasteful non-zero defaults
  so the effect is visible on first retrigger.
