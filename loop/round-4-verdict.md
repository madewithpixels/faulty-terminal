Round 4 verdict: PASS

Reasoning: the heart bitmap decode was verified externally (node emulation of
the exp2/floor/mod path reproduces the PSD sample exactly), all new GLSL is
ES 1.0 mediump-safe with masks within exact-integer range, hot paths are
gated (mwpGate early-returns at 0/1; heartStamp only runs while the ~1.6s
wave envelope is live and bails radially before bitmap decode), and the
exporter round-trip passes with the new MWP section.

Checks:
- Constraints: screen blend, pause logic, panel architecture untouched;
  single file; no new dependencies. createInstance interface unchanged
  (new params flow through unifMap + the two JS-only branches).
- GLSL ES 1.0 mediump: exp2/mod/floor/step/mix/smoothstep only; no arrays,
  no integer types; ternary chains for row masks.
- Panel copy output: simulated — valid JS, all keys present, sections
  RIPPLE / AFTERSHOCK / RIPPLE FX / MWP / FIELD / FIELD FX.
- JS: node --check passes; GLSL: parses via @shaderfrog/glsl-parser.
- Behaviour deltas accepted and documented: colour-block threshold unified
  with glyph threshold (was 0.68 vs 0.85); MWP glyphs absent pre-reveal by
  design (owner request).
