Round 1 changes — ripple physicality FX (wobble, warp, impact burst)

All three are strength sliders in a new RIPPLE FX panel section; 0 = effect
fully compiled-out-cheap (branch on uniform) and visually off.

1. TUNING: added `rippleWobble: 0.35`, `rippleWarp: 0.45`, `impactBurst: 0.80`
   under a `// ripple fx` comment (needed so the panel copy exporter output
   pastes back cleanly).

2. SLIDERS: three new entries after the AFTERSHOCK block, section 'RIPPLE FX':
   rippleWobble→uRippleWobble (0–1), rippleWarp→uRippleWarp (0–1),
   impactBurst→uImpactBurst (0–2). All have uniform names, so setParam/getParam
   are handled by the existing unifMap with no JS special-casing.

3. Fragment shader:
   - New uniforms uRippleWobble, uRippleWarp, uImpactBurst.
   - New helper `ringWobble(vec2 dh)` directly after hash21(): two angular
     sinusoids (5θ and 9θ, counter-drifting in time) scale the ring radius by
     ±7% at slider max. Early-outs to 1.0 when the slider is 0.
   - digit(): reveal radius multiplied by ringWobble(dh) inside the existing
     uRippleActive branch.
   - getColor(): impact-burst block after the displace() lines — while
     uRippleProgress < 0.3, ~40% of 30-per-screen rows tear horizontally by up
     to 0.05 uv·scale units, amplitude decaying quadratically with progress.
     Re-hashed at 24Hz via floor(iTime*24.0). Pure function of existing ripple
     state, so it replays on retrigger automatically.
   - main(): shock-warp block after barrel(), before p = uv*uScale. A
     smoothstep band (width 0.3) centred on the wobbled wave front pulls uv
     radially toward the origin by up to 0.02 (2% of uv space) at slider max;
     the aftershock front gets a 0.6-weighted, slightly narrower copy. Warp is
     multiplied by uRippleFade so it dissolves with the trail. Aspect ratio is
     corrected on the way in (dh.x *= iResolution.z) and back out
     (dir.x /= iResolution.z).
   - main(): colour-ring radius and aftershock radius also multiplied by
     ringWobble() so colour, reveal, warp and aftershock stay in lockstep.

4. Program uniforms: three new entries reading opts.rippleWobble /
   opts.rippleWarp / opts.impactBurst with ??0 fallbacks.

Why: addresses the "no wave shape variation" known weakness and the flat,
transient-free trigger moment; see round-1-critique.md.
