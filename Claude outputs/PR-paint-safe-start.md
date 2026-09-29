# v1.10.0: paint-safe start (`feature/paint-safe-start` → `main`)

## Summary

This PR adds three options, all on by default. Each one set to `false` gives back the exact v1.9.1 behaviour for that part.

- **`softwareFallback`**: when WebGL is software-rendered (SwiftShader, llvmpipe, softpipe, "software", Basic Render) or there is no context, nothing renders.
  - The container keeps its painted slate and gets `.ft-static`.
  - `faulty-terminal:ready` still fires, with `detail.static = true`.
  - `console.info` logs once.
  - `retrigger`, `setParam` and `getParam` do nothing.
- **`deferLoop`**: while the ripple is armed, it draws one frame, so `ready` still fires on the same frame as v1.9.1. It then holds the rAF loop until one of these happens:
  - `does-ripple` is added
  - the `revealFallback` timer fires
  - `retrigger()` is called
  - it scrolls on screen, if it was off screen when triggered

  `fade` and `instant` start at once, as before.
- **`warmStart`** (with `warmStartMs`, default 2000):
  - For the first 2s of page life it renders at `max(renderScaleMin, 0.5)` and caps at 30fps.
  - If the first 500ms window is below `fpsLow`, it drops straight to `renderScaleMin`.
  - A device that held 30fps goes **straight** back to full scale at the end of the window. It does not climb 0.03/s, which would take about 17s.
  - A loop that first starts after the window starts at full scale.
- **Phosphor deferral was skipped.** Creating the render targets after warm-up would drop the phosphor trail on the ring's first frames, which is a visible change mid-reveal. Their cost already scales with render scale, so warm start cuts it by about 4×.

The "off" switches:

```js
window.FaultyTerminalConfig = { softwareFallback: false, deferLoop: false, warmStart: false };
```

They also work per element through `data-ft-opts`, or `data-ft-software-fallback="false"` / `data-ft-defer-loop="false"` / `data-ft-warm-start="false"`.

## Testing

**Visual parity.** I used a deterministic harness: virtual clock, seeded `Math.random`, and a `readPixels` hash of every frame. It covered 360 vsyncs (6s) in each of 6 scenarios:

- ripple at 900ms
- no ripple (fallback)
- `reveal: 'fade'`
- `reveal: 'instant'`
- ripple at 3.2s
- `autoTune: false`

v1.10.0 with all three options off matched v1.9.1 frame for frame in every scenario: **0 mismatched frames**, same ready frame, same ripple and fallback timing.

With each option on:

- `deferLoop` only: 0 mismatched frames once the loop runs. Before that, only the one ready frame is drawn and the loop is held: 54 idle vsyncs up to the ripple at 900ms, or 149 up to the 2.5s fallback.
- `warmStart` only: the canvas is at half size until 2.05s, then returns to full size and matches v1.9.1 from 2.5s on (phosphor history settling).

**Software path** (headless Chromium, which uses SwiftShader):

- `.ft-static` is applied and there is no canvas.
- **0 rAF callbacks** over 200 vsyncs.
- The slate background shows, and `ready` fires with `static: true`.
- The `console.info` appears once with 2 instances.
- The API calls and the debug panel don't throw.
- All three ways of switching it off (`FaultyTerminalConfig`, `data-ft-software-fallback`, `data-ft-opts`) bring the renderer back.

**Lighthouse 12** (CLI, headless, no GPU): a local page with a hero heading, a JS-driven entrance animation standing in for IX3, and `does-ripple` added at 1.2s. The table shows the median of 3 runs.

| | Score | FCP | LCP | TBT | Speed Index |
|---|---|---|---|---|---|
| **Mobile**, v1.9.1 | 58 | 1.32s | 2.34s | 149s | 21.6s |
| **Mobile**, v1.10.0 | **100** | 1.25s | 1.40s | 13ms | 1.25s |
| **Desktop**, v1.9.1 | 29 | 3.27s | 4.10s | 27.2s | 11.3s |
| **Desktop**, v1.10.0 | **100** | 0.34s | 0.37s | 0ms | 0.34s |

v1.10.0 with `softwareFallback: false` (only `deferLoop` and `warmStart` on) scored:

- Mobile: 59–61, FCP about 1.3s, TBT about 153s
- Desktop: 60, FCP 0.34s, TBT 37s

So the fallback is what fixes the score. The other two bring desktop FCP forward from 3.3s to 0.34s.

FCP was reported in every run. The intermittent NO_FCP didn't reproduce locally, but the huge TBT on v1.9.1 is the same starvation.

**Still to do by hand:**

- Lighthouse in DevTools against staging
- a mid-range phone, logging autoTune: `FaultyTerminal.instances[0].ctn.querySelector('canvas').width`
- console on a GPU machine: nothing new is logged on the happy path

## Release

- Version 1.10.0, `dist/` rebuilt, annotated tag `v1.10.0`, CHANGELOG.md added and README updated.
- `v1.9.1` and its `dist/` are untouched.
- A new tag means a new URL, so there is **nothing to purge**. Hit it once after pushing to warm the cache:

  `https://cdn.jsdelivr.net/gh/madewithpixels/faulty-terminal@v1.10.0/dist/faulty-terminal.min.js`

  If anything uses the `@1` range, purge it at `https://purge.jsdelivr.net/gh/madewithpixels/faulty-terminal@1/dist/faulty-terminal.min.js`.
- **SRI:** if the site's script tag or preload has an `integrity` attribute, the hash has to change with the version. The two hashes are:
  - 1.10.0: `sha384-JrtZp6EC4itM/cjoTRLN0Enlpo4BocfFyksYFJJAfSj1kuY6ylapLPn5LXZL8xPF` (the complete tag is in `webflow/faulty-terminal-loader.html`)
  - 1.9.1 (for rollback): `sha384-mzeLYzvZR3+KT5aRmt8fWos+XFeDolsZQya5jP9N/AZ1BtO6BhapX0pq435mt18r`
