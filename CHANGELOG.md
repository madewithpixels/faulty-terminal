# Changelog

## 1.10.0 — paint-safe start

Keeps the terminal out of the way of the page's first paint on software WebGL
(Lighthouse / PageSpeed, Googlebot) and slow CPUs. No visual change on devices
with a GPU once the warm-start window has passed; public API unchanged.

Three new options, all on by default. **Each one set to `false` restores the
exact v1.9.1 behaviour for that part** (checked frame for frame against v1.9.1):

| Option | Default | Off value | What it does |
|---|---|---|---|
| `softwareFallback` | `true` | `false` | Software WebGL (SwiftShader, llvmpipe, softpipe, "software", Microsoft Basic Render) or no WebGL context: no renderer and no render loop. The container keeps its painted background and gets `.ft-static`. `faulty-terminal:ready` still fires, with `detail.static = true`. `console.info` once per page. |
| `deferLoop` | `true` | `false` | While the ripple reveal is armed, draw one frame (so `ready` fires as before), then hold the rAF loop until `does-ripple`, the `revealFallback` timer or `retrigger()`. `reveal: 'fade'` / `'instant'` start at once, as before. |
| `warmStart` | `true` | `false` | For the first `warmStartMs` of page life, render at `max(renderScaleMin, 0.5)` and ≤30fps. A first measurement window below `fpsLow` drops straight to `renderScaleMin`. At the end, if the device held 30fps, it goes straight back to full scale. Otherwise `autoTune` carries on as before. |
| `warmStartMs` | `2000` | — | Length of the warm-start window (ms). |

Switch everything off from the site without a rollback:

```js
window.FaultyTerminalConfig = { softwareFallback: false, deferLoop: false, warmStart: false };
```

The options also work per element through `data-ft-opts`, the config template, or
`data-ft-software-fallback="false"`, `data-ft-defer-loop="false"`, and
`data-ft-warm-start="false"`.

Notes:

- Phosphor render targets are **not** deferred until warm-up ends. Creating them
  later would drop the phosphor trail for the ring's first frames. That is a
  visible change during the reveal. Their cost already scales with render
  scale, so warm start cuts it by about 4×.
- The static instance has the same shape as a live one (`ctn`, `opts`,
  `setParam`, `getParam`, `retrigger`, `ready`, `hasRipple: false`), plus
  `static: true`.

## 1.9.1

`reveal: 'fade'` starts at once, with a 1500ms build-up.

## 1.9.0

Added the `reveal` setting, a configurable load fade, and the ready event.
