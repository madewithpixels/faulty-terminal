Round 6 changes — configurable MWP wave timing + phosphor persistence
(41,592 → 43,533 chars; 6,467 under the 50k Webflow limit)

1. New TUNING defaults applied (owner-supplied): rippleColorAmbient 0.34,
   aftershockTriggerAt 0.05, mwpColorStrength 0.68, mwpDensity 0.13,
   mwpFlickerSpeed 0.00, mwpWaveDuration 1050, heartStrength 2.00,
   heartScale 1.50, heartFalloff 0.70.

2. mwpWaveAt (TUNING 0.25; MWP slider 'wave at' 0–1, JS-only): the MWP heart
   wave now launches when eased aftershock progress crosses this threshold
   instead of waiting for completion — at 0.25 it overlaps the aftershock's
   expansion. 1.0 reproduces the old on-landing behaviour. With aftershock
   disabled, the same threshold is applied to eased ripple progress (moved out
   of the rp>=1 branch). setParam/getParam wired.

3. phosphor (TUNING 250; FIELD FX slider 'phosphor (ms)' 0–600, JS-only):
   true CRT afterglow via frame feedback.
   - Lazy pipeline (ensurePhosphor): scene RenderTarget + ping-pong
     accumulator pair (depth:false), a feedback program
     (max(scene, prev × uDk)) and a copy program, all built on first use.
   - update(): when phosphorRef > 0.5 → main pass renders to rtScene,
     feedback pass writes to rtA with uDk = exp(-dtMs/phosphor)
     (frame-rate-independent decay), copy pass presents rtA, ping-pong swap.
     Otherwise the exact original renderer.render({scene:mesh}) runs.
   - applySize() reallocates the RTs when the canvas size or renderScale
     changes (only if the pipeline exists).
   - import extended with RenderTarget (still only ogl from esm.sh).

Notes: max()-based accumulation can't exceed source brightness (no additive
blowout) and leaves background pixels untouched. prevT updates every rendered
frame, so long pauses (tab hidden) produce decay≈0 — trails clear rather than
smear. Aux shaders are GLSL ES 1.0 and were parse-verified alongside the main
shader.

Addendum (same round): phosphorOn checkbox added to FIELD FX (bool, TUNING
default true) — explicit on/off gate ANDed with phosphor(ms) > 0 in the render
branch; exports as `phosphorOn: true/false`. Re-verified: node --check, export
simulation, 43,780 chars (6,220 under limit).
