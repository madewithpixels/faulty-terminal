Round 1 verdict: PASS

Reasoning: all changes are GLSL ES 1.0 mediump-safe (sin/atan/smoothstep/hash21
only, no derivatives or integer types), gated behind existing uRippleActive
branches or zero-checked uniforms so idle-field cost is unchanged, the screen
blend formula / pause logic / panel architecture are untouched, and the copy
exporter still emits a valid TUNING block because all three new keys exist in
TUNING and SLIDERS with uniform-backed get/set.

Checks:
- Constraints respected: yes (single file, ogl only, no TUNING changes beyond
  the keys this change introduces).
- GLSL ES 1.0 mediump: yes — ringWobble declared before first use; atan given
  an epsilon'd x to avoid undefined atan(0,0).
- Panel copy output: verified format — new keys emit as `key: value,` lines
  under a `// ripple fx` section comment; booleans unaffected.
- JS syntax: node --check on the extracted module passes (run at end of
  session, see round-2-verdict.md for the shared verification transcript).
