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

---

## As launched (30 Oct 2026) and the v1.12.0 update

**What is live on madewithpixels (v1.11.0):**

- Site footer: the SRI-pinned `@v1.11.0` tag in place of `@1.10.1`.
- Home: two registered scripts (Site/Page settings → Custom code shows them as
  `FTLogoResolveHead` and `FTLogoResolveFooter`), not the freeform blocks.
  - Head: adds `html.ft-lr` (hides `.mwp-logo`, 10s CSS failsafe; skipped for
    reduced motion) and defines `window.mwpLogoPlace(logo)`, which sizes and
    places the heart in whole device pixels and returns `{ pitch, size }`.
  - Footer: sets the options as `data-ft-*` attributes on the terminal element
    (they beat `window.FaultyTerminalConfig` whatever order the scripts run
    in), calls `resolveLogo()` after first paint, then runs the flare and the
    ripple itself.
- Hero interaction: the "Ripple" (`does-ripple`) step is hidden, not deleted.

**v1.12.0 moves the flare and ripple into faulty-terminal** (`logoFlare`,
`logoRipple`), so the debug panel's timeline can play, scrub and tweak the whole
sequence. Going to v1.12.0 on the site needs:

1. Site footer tag → `@v1.12.0` (the tag in `webflow/faulty-terminal-loader.html`).
2. Home footer script → version 1.12.0 of `FTLogoResolveFooter`, which adds
   `data-ft-logo-flare="true"` and `data-ft-logo-ripple="true"`, calls
   `resolveLogo()` and removes `html.ft-lr` straight after. faulty-terminal
   hides the heart from then until the hand-off. The head script is unchanged.
3. Publish. Then backtick opens the panel; ⧉ pops it out.

Both must change together: the 1.12.0 footer script expects faulty-terminal to
run the flare.

## Hero only (31 Oct 2026, FTLogoResolveFooter 1.12.2)

The hero is sticky, so the terminal shows through the whole page. When the
Home page opens already scrolled past the hero (reload, back/forward, the
project back button's restore, or a `#link`), the content already covers the
heart, so the resolve doesn't play. The field fades in as usual, then the
timeline jumps to its end (`logoTimeline.seek(schedule.done)`): heart shown,
no resolve, flare or ripple. The script works out the start position before
the browser restores the scroll, from the navigation type, the `mwp-home-y`
value the page transition script saves, and the `#hash` target. The rule:
"in the hero" means `.content-main` hasn't reached the bottom of `.mwp-logo`.
Source: `webflow/home-logo-resolve-footer.js`.
