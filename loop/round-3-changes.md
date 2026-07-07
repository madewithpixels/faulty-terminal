Round 3 changes — aftershock exports with TUNING; blend mode selector

1. TUNING: `aftershock: true` moved here from DEFAULTS' explicit list (its old
   position in DEFAULTS clobbered any pasted TUNING value because it sat after
   the spread). Added `blendMode: 0` after rippleColorStrength.

2. Exporter (#ft-copy handler): no longer skips bool sliders — emits
   `key: true/false` lines. Section comment handling moved above the bool
   check so AFTERSHOCK's comment still emits. Numeric/select keys emit via
   fmt() as before. Output verified valid JS and round-trip effective.

3. SLIDERS: new entry ['blendMode','uBlendMode','blend mode',0,3,1,'RIPPLE',
   'select'] after colour strength. New module-level SELECT_OPTIONS map keyed
   by param key: blendMode → ['screen','add','overlay','soft'].

4. Panel: new 'select' input type — renders a styled <select> whose option
   index is the numeric param value; handled in the build loop and in
   loadInst() for instance switching. setParam/getParam flow through the
   existing unifMap (uniform-backed).

5. Fragment shader: new uniform uBlendMode + helper blendGlow(base, glow):
   mode 0 = the protected screen formula verbatim (default), 1 = additive,
   2 = overlay (per-channel step(vec3(0.5), base)), 3 = soft light (pegtop).
   The ripple block's `screened` and the aftershock block's `ascreened` now
   call blendGlow instead of inlining screen. Colour containment is preserved
   in all modes because the result is still applied via
   mix(col, screened, blend) — blend is 0 on background pixels.

6. Program uniforms: uBlendMode reading opts.blendMode ?? 0.

Owner-requested round (export aftershock state; panel access to blend mode).
