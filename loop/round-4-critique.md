Round 4 critique — MWP glyphs are static set-dressing, not part of the narrative

(a) Weakness
The M/W/P brand characters are purely ambient: hash-chosen cells, fixed 15%
density (hardcoded step(0.85, …)), fixed flicker timing, present from frame
zero. Three problems:
1. No tuning control over density or timing — the only MWP slider is colour.
2. They exist *before* the reveal, so the brand characters are already sitting
   in a dark, un-woken field. Narratively they should be introduced by the
   heart's energy, not pre-exist it.
3. A long-standing inconsistency: digit() uses threshold 0.85 for letter cells
   but the colour block in main() uses 0.68, so some cells get MWP colour tint
   on non-letter glyph patterns. Unifying both behind one density uniform
   fixes control and consistency in one move.

(b) Proposed change (owner-directed)
New MWP panel section + heart-stamp sequence:
1. uMwpDensity (default 0.15 = current look) and uMwpFlicker (timing
   multiplier; 0 freezes glyph selection) — both shared by digit() and the
   colour block so glyph and colour always agree.
2. uMwpReveal gate: 0 until the MWP wave starts, so no M/W/P glyphs (or MWP
   colour) exist anywhere pre-reveal. Instances with ripple:false initialise
   to 1 (unchanged behaviour).
3. When the aftershock completes ("lands") — or the main ripple completes if
   aftershock is off — a JS-timed MWP wave starts: uMwpReveal ramps 0→1 over
   mwpWaveDuration, radially gating glyph appearance from the origin with the
   same hash-staggered edge as the ripple reveal, then latches at 1.
   Simultaneously uMwpWaveEnv (fast attack, quadratic decay) drives a
   heartStamp(): a 9×8 pixel-heart bitmap (bitmask rows decoded via
   exp2/mod — GLSL ES 1.0 safe, masks ≤511 within mediump exact-integer
   range) centred on the ripple origin, brand-gradient coloured by row,
   with a radial falloff halo (uHeartFalloff, default ≈3.4 cells). Inside the
   stamp: glyph display is forced on, glyph intensity is boosted, and the MWP
   colour path is temporally brightened (uHeartStrength) using the heart
   pixel's colour.

(c) Risks / regressions
- digit() cost: heartStamp ×5/pixel — but only while uMwpWaveEnv > 0 (~1.6s
  per trigger) and with an early radial bail-out before bitmap decode. The
  uMwpReveal gate costs one length() per cell only while reveal < 1.
- Colour-block threshold change (0.68 → 1−density = 0.85 default) slightly
  reduces incidental colour speckle; judged an improvement (consistency), and
  the density slider recovers any desired amount.
- The heart bitmap is an approximation of the GSAP heart asset; shape and
  palette mapping are isolated in heartStamp() for easy replacement.
- mwpColorStrength moves from RIPPLE to the new MWP section — export section
  grouping changes; all keys remain in TUNING so round-trip holds.
- If aftershock lands while tab is hidden, rendering is paused so the wave
  start is deferred to the next rendered frame — acceptable.
