Round 2 verdict: PASS

Reasoning: all three effects are GLSL ES 1.0 mediump-safe (exp/dot/fract/sin
only), zero-gated so the idle-cost regression is opt-in, the screen blend
formula and pause logic are untouched, and the copy exporter emits the three
new keys as valid TUNING lines under a `// field fx` comment.

Checks:
- Constraints respected: yes — sweep modulates `blend` rather than adding flat
  light, preserving "colour lives inside the glyphs"; vignette is a multiply on
  final col, not a blend-mode change.
- GLSL ES 1.0 mediump: yes — no derivatives, no int types, uniform-gated ifs.
- Panel copy output: format verified; new keys round-trip TUNING → sliders →
  copy → TUNING.
- Shared verification (rounds 1+2): JS module extracted from the embed passes
  `node --check`; grep confirms all six uniforms present at declaration,
  Program-uniform, and SLIDERS sites (31 references). Shader sections re-read
  line-by-line after editing; brace/paren structure and declaration order
  (ringWobble before first use in digit/main) confirmed.
