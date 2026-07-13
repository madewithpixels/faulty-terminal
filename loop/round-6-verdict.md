Round 6 verdict: PASS

Reasoning: phosphor is fully opt-out (slider 0 runs the byte-identical
original render call), the wave-timing change strictly generalises the old
behaviour (mwpWaveAt=1.0 ≡ previous hardcoding), and the file remains 6.5k
under the 50k Webflow limit at 43,533 chars.

Checks:
- Constraints: pause/resume logic untouched (feedback pipeline simply idles
  while stopped); screen blend untouched; single file; RenderTarget comes from
  the existing ogl import — no new dependencies.
- GLSL ES 1.0 mediump: main + both aux shaders parse; aux shaders use only
  texture2D/max/exp-free math (decay computed in JS).
- Panel copy output: all SLIDERS keys (incl. mwpWaveAt, phosphor) present in
  TUNING; export simulation passes.
- JS: node --check passes.
- Owner defaults applied and spot-verified (ambient 0.34, trigger 0.05,
  wave 1050/0.25, phosphor 250).
