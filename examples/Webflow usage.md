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

### Component properties (optional)

Webflow can expose per-instance settings on a component. Add these as
**custom attributes** on the root div, then promote each attribute value to a
component property:

| Attribute | Property name | Example value |
|-----------|---------------|---------------|
| `data-ft-tint` | Tint | `#ff6b6b` |
| `data-ft-bg` | Background | `#2b464e` |
| `data-ft-ripple` | Ripple | `true` / `false` |
| `data-ft-origin` | Ripple origin | `#hero-logo` |
| `data-ft-opts` | Advanced (JSON) | `{'curvature':0.1,'brightness':0.7}` |

`data-ft-opts` takes any key from the TUNING/DEFAULTS tables in the README.
Use **single quotes** inside it — Webflow's attribute field rejects nested
double quotes.

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
