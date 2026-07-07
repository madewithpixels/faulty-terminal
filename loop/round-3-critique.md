Round 3 critique — exporter drops state; blend mode is hardcoded

(a) Weakness
Two workflow gaps raised by the owner in live iteration:
1. The copy exporter skips boolean sliders entirely (`if(type==='bool') return`),
   so the aftershock on/off choice is lost from exported TUNING blocks. Worse,
   even if it were emitted, pasting it into TUNING wouldn't take effect:
   DEFAULTS sets `aftershock: true` explicitly *after* spreading TUNING, so the
   spread value gets clobbered.
2. The ripple/aftershock glow blend is hardcoded to screen. Screen is the
   correct default (per the brief), but during tuning sessions there is no way
   to audition alternatives without editing GLSL.

(b) Proposed change
1. Move `aftershock: true` from DEFAULTS' explicit list into TUNING (spread
   order then makes pasted values effective), and change the exporter to emit
   bool sliders as `key: true/false` lines instead of skipping them.
2. Add uBlendMode (0 screen / 1 add / 2 overlay / 3 soft) via a new GLSL helper
   blendGlow(base, glow). Mode 0 returns the protected screen formula
   *verbatim*. Both the ripple and aftershock blocks call the helper. Panel
   gets a new 'select' slider type rendering a <select>; exported as a numeric
   `blendMode` TUNING key.

(c) Risks / regressions
- "Do not change the screen blend formula": honoured — mode 0 is byte-for-byte
  the same expression and remains the default (blendMode: 0). The owner
  explicitly requested panel access to the blend mode.
- Additive/overlay modes could spill colour onto the background — prevented
  structurally, because the result is still mixed in by glyph luminance
  (`mix(col, screened, blend)`), which is 0 on background pixels.
- Exporter output must stay paste-able: booleans emit as bare true/false,
  which is valid JS in a TUNING block now that aftershock lives in TUNING.
- New 'select' input type in the panel must round-trip through loadInst() when
  switching instances — handled by treating it like a range input whose value
  is the numeric mode index.
- Overlay uses step(vec3(0.5), base) per-channel — GLSL ES 1.0 safe.
