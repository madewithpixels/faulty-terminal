Round 6 critique — wave timing is hardcoded to the aftershock's end; no true persistence

(a) Weakness
1. The MWP heart wave launches only when the aftershock completes. The owner
   wants it much earlier, overlapping the aftershock — and timing like this
   should never have been hardcoded in the first place; every other beat in
   the sequence (aftershockTriggerAt, aftershockDelay) is tuneable.
2. The field has no temporal persistence. Real CRT phosphor keeps emitting
   after the beam moves on; here a dot that turns off vanishes in one frame.
   With the owner's new defaults freezing MWP flicker (mwpFlickerSpeed 0),
   the in-shader "ghost of previous flicker step" trick would do nothing —
   true persistence needs frame feedback.

(b) Proposed change
1. mwpWaveAt (JS-only slider, MWP section, default 0.25): the wave launches
   when eased aftershock progress crosses this threshold (or ripple progress,
   when aftershock is disabled). 1.0 reproduces the old behaviour exactly.
2. phosphor (ms) (JS-only slider, FIELD FX, default 250): when > 0, the main
   pass renders into a scene RenderTarget; a feedback pass writes
   max(scene, prevAccum × decay) into a ping-ponged accumulator; a copy pass
   presents it. decay = exp(-dtMs / phosphor) computed per frame in JS, so
   trail length is frame-rate independent. At 0 the render path is the exact
   current single-pass call — zero regression. RTs are allocated lazily on
   first use and reallocated on resize; depth buffers disabled.
3. Apply the owner's new TUNING defaults (posted in chat).

(c) Risks / regressions
- Two extra fullscreen passes while phosphor > 0. Both shaders are two texture
  taps and a max() — trivial next to the main pass; autoTune's FPS governor
  already handles weak GPUs. maxPixels budget unchanged (RTs match canvas
  size, which it already governs).
- ogl RenderTarget textures aren't explicitly disposed on resize realloc —
  rare event, transient, accepted.
- max()-based accumulation cannot exceed source brightness, so no additive
  blowout; background pixels are unaffected (max of identical bg values).
- IntersectionObserver/visibilitychange pause logic untouched — feedback
  simply stops advancing while paused; prevT is refreshed each rendered
  frame so a long pause yields decay≈0 (trail cleared), which is correct.
- Char budget: must stay under 50,000. Estimated +1.6k on 41,592.
