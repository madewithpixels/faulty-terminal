# Webflow usage

The effect ships as one script on jsDelivr. Nothing is copy-pasted into Webflow
except a single tag, so shipping a visual change means tagging a new release —
not re-pasting 90KB into every site.

---

## 1. Add the script (once per page)

Page Settings → Custom Code → **Before `</body>` tag**:

```html
<script src="https://cdn.jsdelivr.net/gh/madewithpixels/faulty-terminal@1/dist/faulty-terminal.min.js"></script>
```

`@1` tracks the latest 1.x release, so bug fixes arrive automatically and
breaking changes never do. Pin exactly (`@1.0.0`) if a site must be frozen.

Site-wide overrides go in a `<script>` **above** that line — see
[`webflow-embed.html`](./webflow-embed.html) for the full paste-able block.

> Custom code only runs on the **published** site, not in the Designer canvas.

---

## 2. Build the component

In the Designer:

1. Add a **Div Block**, class `faulty-terminal`.
2. Style it: `position: absolute`, inset `0` (or `width: 100%`, `height: 100svh`).
   Give it a lower `z-index` than the content that sits over it.
   The parent Section needs `position: relative`.
3. Right-click the Div → **Create Component**. Name it `Faulty Terminal BG`.

Now drop the component into any section on any page. The script finds it.

### Component properties — per-instance configuration

Webflow can bind a component property to an element's **text**, but not to a
custom attribute's value. So the config travels in an inert `<template>` inside
the component:

```html
<template data-ft-config>
  <i data-ft-k="tint">…bound to the Tint property…</i>
  <i data-ft-k="brightness">…bound to Brightness…</i>
</template>
```

Nothing in a `<template>` is rendered, styled, or exposed to screen readers, and
the script deletes the node as soon as it has read it — so this costs the page
nothing. Set the values per instance in the Settings panel like any other
component property.

Current properties, and the option each one feeds:

| Property | Option | Example |
|----------|--------|---------|
| Tint | `tint` | `#ff6b6b` |
| Background | `bgColor` | `#2b464e` |
| Brightness | `brightness` | `0.7` |
| Time scale | `timeScale` | `0.45` |
| Ripple on | `ripple` | `true` / `false` |
| Ripple origin | `rippleOriginSelector` | `.mwp-logo` |
| Advanced options | JSON blob | `{'curvature':0.1}` |

**Leave a property blank and the default applies** — blanks are ignored rather
than written as empty values. Values are coerced by the type of the default, so
`0.7` arrives as a number and `false` as a boolean, while colours and selectors
stay strings.

To expose another option, add a child to the template with
`data-ft-k="<optionKey>"`, create a property, and bind that child's text to it.
Any key from the README's TUNING tables works. Add only what needs to be
editable — a wall of properties makes the component worse, not better.

Outside Webflow, the same options can be set as `data-ft-*` attributes
(`data-ft-tint`, `data-ft-ripple-duration`, …), which take precedence over the
template.

---

## 3. Trigger the ripple reveal

The reveal fires when the element gains the class `does-ripple`.

**Webflow interaction:** Page Load (or Scroll Into View) → Element Trigger →
add class `does-ripple` to the terminal div.

**Or from custom code:**

```html
<script>
  window.FaultyTerminal.retrigger();           // all instances
  window.FaultyTerminal.retrigger('#hero-bg'); // one
</script>
```

Disable the reveal on a specific instance with `data-ft-no-ripple`.

---

## 4. Brand colours

The ripple gradient reads CSS variables from `:root`, so set them once in
Webflow's site styles and every instance follows:

```css
:root { --raspberry: #E84F5C; --coral: #F28745; --teal: #3DC096; }
```

---

## Tuning on a live site

Add `?ft-debug` to any published URL to open the debug panel (backtick toggles
it). Drag sliders, hit **⎘ copy values**, paste the result into the `TUNING`
block in `src/faulty-terminal.js`, rebuild, tag a release — every site picks it
up on the next cache cycle.

---

## Notes

- Off-screen instances pause, so stacked full-height sections don't all render.
- `scale` and `digitSize` change the look but not the cost; performance scales
  with rendered pixel area, capped adaptively by `maxPixels`.
- Elements added after page load (CMS filters, tab panes, modals) aren't picked
  up automatically — call `window.FaultyTerminal.init()` afterwards. It's safe
  to call repeatedly; running instances are skipped.
- No CDN allowed? `faulty-terminal.embed.html` in the repo root is the same
  build inlined into a single paste-able file.
