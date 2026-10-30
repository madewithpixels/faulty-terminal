# Site wiring — logo resolve (faulty-terminal v1.11.0, madewithpixels Home)

What the Webflow side needs so the heart resolves out of the field. FT does the
shader side; the site owns the HTML heart, the flare and the ripple call.

## 1. Script

Site Settings → Custom Code → Footer: replace the v1.10.1 tag with the one in
`webflow/faulty-terminal-loader.html` (pinned `@v1.11.0` + SRI). Rollback = the
v1.10.1 tag; nothing else on the site depends on 1.11.

## 2. Config (Home only)

Home → Page settings → Custom code, **head** (must exist before the footer
script runs):

```html
<script>
window.FaultyTerminalConfig = Object.assign(window.FaultyTerminalConfig || {}, {
  gridLock: '.mwp-logo',          // the HTML heart; cells lock to its grid
  logoResolve: true,
  rippleGate: false,              // ripple pulses over the visible field
  rippleOriginSelector: '.mwp-logo',
  logoFullScale: true             // default; full render scale during the resolve
  // logoPitch / logoSize: only if the heart is not 18 / 16 CSS px (see 4)
});
</script>
```

The component's 53 string props don't cover the new keys, so they go here (or
in the component's `opts` JSON prop). Other pages are untouched.

**Remove the Home `does-ripple` interaction** (Add Class on `.ft-wrapper`).
With logo resolve the site fires the ripple itself; a `does-ripple` arriving at
load would start an early ripple. `revealFallback` stands down once the site
drives the field, so nothing fades in on its own after 2.5s.

## 3. Timeline

Simplest: let FT run its side on the approved timings and hang the flare and
ripple off the hand-off.

```js
document.addEventListener('faulty-terminal:ready', (e) => {
  const ft = e.detail.instance;
  if (!ft.resolveLogo) return;                 // older build
  const logo = document.querySelector('.mwp-logo');
  logo.style.visibility = 'hidden';            // FT draws the heart until hand-off
  window.addEventListener('load', () => {      // after first paint, never before
    ft.resolveLogo().then(({ static: isStatic, reducedMotion }) => {
      logo.style.visibility = '';              // same frame as the hand-off
      if (isStatic || reducedMotion) return;   // fallback: heart just shows, no ripple
      playFlare(logo);                         // flareMs 350, flareSpread 500, Bayer order
      setTimeout(() => ft.retrigger(), 60);    // rippleAt 60
    });
  }, { once: true });
});
```

- If `load` has already fired by the time `ready` arrives, call it at once
  (`document.readyState === 'complete'`).
- Software WebGL (`.ft-static`) and reduced motion resolve immediately with
  `static` / `reducedMotion` true. The HTML heart must be visible in those
  cases — the snippet does that by unhiding it in `.then()`. Safer still: hide it
  with a class that is only added when `ft.static` is false and
  `ft.reducedMotion` is false.
- Schedule for reference (ms from `resolveLogo()`): field 0→500, resolve
  750→1950, degauss 1530→3080, hand-off + flare 2940, ripple 3000.

Driving it yourself instead (e.g. one GSAP timeline):
`ft.setFieldProgress(p)`, `ft.setLogoProgress(p)`, `ft.setDegaussProgress(d)`,
then `ft.setLogoVisible(false)` on the frame the HTML heart appears. Full-scale
rendering switches on at the first `setLogoProgress > 0` and off at
`setLogoVisible(false)`.

## 4. HTML heart geometry

- `.mwp-logo` box = the 9 × 7 pixel grid exactly: its top-left is the top-left
  pixel's corner (no padding/border around the grid).
- Pixels sized in whole device pixels (e.g. 14 + 2 device px at 90% zoom).
  Whenever the site recomputes that, pass the CSS-px values:
  `ft.relayout({ pitch: 16 / devicePixelRatio, size: 14 / devicePixelRatio })`.
  At 100% / DPR 1 the defaults (18 / 16) already match.
- Moving or resizing the heart: call `ft.relayout()`. Container resizes and
  heart size changes are picked up automatically.

## 5. Flare (site side, unchanged from the brief)

Each HTML pixel: brightness up to ×2.6 with a glow in its own colour up to
14px, decaying e^(−t·350/180), started in 4×4 Bayer order across 500ms.

## Check after publishing

- Console clean on a GPU machine; `FaultyTerminal.version === '1.11.0'`.
- The shader heart sits exactly under the HTML heart at hand-off (no jump).
- Canvas width = container width during the resolve
  (`FaultyTerminal.instances[0].ctn.querySelector('canvas').width`), back to
  the autoTune scale after.
- If the phosphor afterglow ever reads as a double heart after hand-off, say
  so — FT can clear the logo region from the phosphor buffer on hand-off.
