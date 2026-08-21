# Webflow component map

Status as of **2026-08-13**. Records every Webflow id the component depends on, so
none of it has to be rediscovered. Mirrors the convention used by Webflow-Navbar-Light.

---

## Sites and pages

| | |
|---|---|
| Library site | `MWP Component Library` — `6a0351de7c4e42148a81db6f` |
| Library page | `Faulty Terminal` — `6a7e446a8ae91621ff289e0c` — `/faulty-terminal` |
| Library component | `Faulty Terminal BG` — `9b168756-b1d7-0528-22d6-fa06a0ebfcc1` |
| Consuming site | `madewithpixels` — `683cced100c63d0f60a847a3` (publishes to `madewithpixels-dev.webflow.io`, no custom domain) |
| Test page | `faulty terminal temp` — `6a7e3009d9de3588407708da` — `/faulty-terminal-temp` |
| Older component | `Faulty Terminal BG` in madewithpixels — `101353df-810e-81f4-1f09-7469ee61b273` (7 props only — superseded by the library one) |

Single-page publishing is **Enterprise-only** on madewithpixels and returns
`Invalid parameter: pageId`. Only a full-site publish is available.

### Library installs namespace the class — the script must not rely on it

Installing this component into a site via Webflow **Libraries** renames its
classes with the source site's name:

```html
<div class="mwp-component-library--faulty-terminal">
```

`.faulty-terminal` then matches nothing, the script initialises zero instances,
and the page renders nothing — with no error, because there is nothing to error
on. Hit on madewithpixels 2026-08-14.

Since **v1.7.0** the script matches `.faulty-terminal`,
`[class*="faulty-terminal"]` and `[data-faulty-terminal]`, and the same tolerance
applies to the reveal class (`does-ripple` or `…--does-ripple`). The component
root also now carries a static `data-faulty-terminal` attribute — attributes
survive a Library install unchanged, so that hook is namespace-proof and is the
one to rely on.

### Per-site prerequisite — the script tag

**The component does nothing without the script.** It is not part of the
component and does not travel with it, via Library or any other route. Every site
that hosts an instance needs this in Site Settings → Custom Code → Footer:

```html
<script src="https://cdn.jsdelivr.net/gh/madewithpixels/faulty-terminal@1.6.0/dist/faulty-terminal.min.js"></script>
```

Pin the exact version and bump it on release. Status:

| Site | Script tag | Version |
|---|---|---|
| madewithpixels | yes, footer | needs bumping to 1.7.0 |
| MWP Component Library | yes, footer — added 2026-08-14 | needs bumping to 1.7.0 |

Symptom when it is missing: the container renders as an empty (often black) div,
no canvas, and `window.FaultyTerminal` is undefined in the console. That is the
first thing to check before suspecting the component.

---

## Structure

```text
Section  [class: ft-stage]
└── Faulty Terminal BG  [DOM div, class: faulty-terminal]
    └── template[data-ft-config]        ← inert config carrier
        ├── div[data-ft-k="tint"]       ← text bound to the Tint property
        ├── div[data-ft-k="bgColor"]
        └── … 53 in total, one per tunable parameter
```

The root **must be a DOM element**, not a Div Block. Div Blocks expose no
settable `attributes` key, and only DOM elements accept a custom tag.

Element ids run in template order from
`9b168756-b1d7-0528-22d6-fa06a0ebfcc3`, incrementing by 2 in hex
(`…fcc3`, `…fcc5`, `…fcc7` …) through to `…fd2b`.

---

## How configuration reaches the script

Webflow **cannot bind a component property to a custom attribute's value** —
`set_settings` with `key: "attributes"` and a `value_binding` fails with
*"value must be a string or a binding"*, with or without a live Designer session.
The identical binding shape **succeeds** on `set_dom_id`, which proves the payload
is right and the `attributes` writer specifically accepts only static strings.
`get_bindable_sources` confirms props bind only to
`string | textContent | altText | id`.

So configuration travels as **text inside an inert `<template>`**. Verified in the
published HTML:

```html
<div class="faulty-terminal"><template data-ft-config=""><div data-ft-k="tint">…
```

Template content is never rendered, never styled and never enters the
accessibility tree. The script reads it at init via `tpl.content` and then
removes the node, so the DOM after init is unchanged.

### Property type rules, established by experiment

| Prop type | Binds to text? | Notes |
|---|---|---|
| `string` | yes | **What we use.** Blank = inherit the shipped default. |
| `number` | yes | Rejected for our purposes: a number prop with no default resolves to **`0`**, not empty, so every instance would pin all 53 values and `brightness: 0` would render nothing. |
| `boolean` | **no** | `"not found or incompatible with target"`. In Navbar Light these bind to element **visibility** only — they never reach JS, which is why its JS-facing values are strings too. |

---

## Properties

53 string properties, all defaulting to empty so blanks fall through to the
`TUNING` block in `src/faulty-terminal.js`. Each carries a tooltip with its range
and default.

| Group | Count | Parameters |
|---|---|---|
| Colour | 2 | tint, bgColor |
| Ripple | 10 | ripple, rippleOriginSelector, rippleDuration, rippleColorFalloff, rippleColorAmbient, rippleColorStrength, blendMode, rippleBrightness, rippleBrightnessFalloff, rippleFadeOut |
| Aftershock | 5 | aftershock, aftershockTriggerAt, aftershockDelay, aftershockDuration, aftershockStrength |
| Ripple FX | 3 | rippleWobble, rippleWarp, impactBurst |
| MWP glyphs | 10 | mwpColorStrength, mwpDensity, mwpFlickerSpeed, mwpWaveDuration, mwpWaveAt, heartStrength, heartScale, heartFalloff, mwpLegible, mwpGlitch |
| Brand cycle | 6 | brandMode, brandStrength, brandSpeed, brandSoftness, brandScale, brandAngle |
| Field | 11 | brightness, glyphGamma, scanlineIntensity, glitchAmount, flickerAmount, noiseAmp, curvature, mouseStrength, timeScale, digitSize, tiltStrength |
| Field FX | 5 | vignette, retraceSweep, noiseDetail, phosphorOn, phosphor |
| Advanced | 1 | opts (JSON blob, single quotes only) |

Property name → parameter key mapping is 1:1 with the `data-ft-k` attribute on
each carrier; read them back with
`data_element_tool > query_elements { element_filter: { attribute_name: "data-ft-k" } }`.

To expose a new parameter later: add a carrier with `data-ft-k="<optionKey>"`
inside the template, create a string property, bind the carrier's `text` to it.

---

## Classes

Both created in the library site on 2026-08-13, verified by read-back. Longhand
only, every property mappable in the Style panel.

| Class | Properties | Travels with the component? |
|---|---|---|
| `.faulty-terminal` | `position: absolute` · `top/right/bottom/left: 0%` · `pointer-events: none` | **Yes.** Also the script's selector — the name is load-bearing, do not rename. |
| `.ft-stage` | `position: relative` · `width: 100%` · `height: 100svh` | **No.** The component is only the DOM div; the section is its parent, outside the component boundary. Demo scaffolding for the library page only — consuming sites use their own section, which just needs `position: relative` and a height. |

No `height`, `width` or `opacity` on `.faulty-terminal`: `inset: 0` sizes it from
the parent, so one class works in a 400px band or a full-height hero with no
combo class and no site variable.

### madewithpixels alignment

`.faulty-terminal` there has been brought in line — `opacity`, `height` and
`width` removed, and the `height: 100%` override at the `small` breakpoint is
gone. Safe because absolutely positioned children contribute nothing to a
parent's height: the hero parent measured 1267px independently of the terminal,
so `inset: 0` reproduces exactly that.

The `--is-100%-height` combo class still exists but is now a no-op (`height: 100%`
matches what the inset already produces). Left in place rather than deleted, since
removing a combo affects every element using it.

**Class-name collision:** both sites now define `.faulty-terminal` identically, so
the class itself is safe either way.

---

## Rollout audit — madewithpixels (2026-08-14)

Every page carrying a `.faulty-terminal`, audited via the element API. The earlier
scan of published HTML under-reported because it matched `faulty-terminal"` with a
trailing quote and missed every combo class — use the element API, or match
`class="[^"]*faulty-terminal[^"]*"`.

| Page(s) | What's there | Config | Needs the component? |
|---|---|---|---|
| Home | component instance | Ripple origin `.mwp-logo` needed | **Done** |
| `/faulty-terminal-temp` | 2 component instances | test page | debris to delete |
| `/estimate` | hand-built div on **Body**, `faulty-terminal + --is-estimate-page` | `data-ft-opts="'rippleOriginSelector': '.mwp-logo'"` | **Yes** — see below |
| Project Page template + 40 portfolio pages | hand-built div in `section.Project Wrapper`, `faulty-terminal + --is-100%-height` | none | **No** — leave them |

### The portfolio pages do not need swapping

A bare `<div class="faulty-terminal">` is the documented minimal integration, not
legacy. The script finds it exactly as it finds a component instance, and these
pages set no per-instance options at all. Swapping 41 pages would be a lot of
Designer clicking to arrive at identical rendering.

The component earns its place only where per-instance configuration is wanted.
That is Home (ripple origin) and `/estimate` (origin, dimming, height) — nothing
else, today.

`--is-100%-height` on those divs is now a **no-op**: `height: 100%` is exactly
what `inset: 0` already produces. Harmless, and not worth a bulk edit.

### `/estimate` is the one non-trivial swap

Its combo `.faulty-terminal.is-estimate-page` sets `height: 150%` and
`opacity: 0.25`, and **a component instance cannot carry a combo class** — you
cannot add classes to an instance root. So the styling has to move before the
component can replace it:

1. `opacity: 0.25` → set the instance's **Brightness** property instead
   (≈ `0.05`, i.e. the 0.20 default × 0.25). This is the same "dim in the shader,
   not in CSS" move already made on Home, and it avoids fading the background
   colour along with the glyphs.
2. `height: 150%` → the div currently sits directly on **Body**. Wrap it in a
   `position: relative` div sized as wanted and put the component inside, so the
   height lives on the parent where it belongs.
3. Set **Ripple origin** to `.mwp-logo` to preserve the existing `data-ft-opts`.
4. Delete the old div.

---

## Do not copy/paste this component between sites

Webflow warns on cross-site paste: *"For pasting cross-site we had to unlink
components, remove some bindings."* That destroys exactly what makes this
component work — the component link and all 53 property bindings. The result is a
detached pile of divs with an inert template full of empty text.

Confirmed by the Navbar Light team's own experience (2026-08-13). They tried both
routes:

- **In-site native rebuild** — duplicated an earlier component, refactored it
  through MCP, moved bound elements where possible, recreated and rebound
  properties, all inside one site. Bindings survived, because the component never
  crossed a site boundary. This is how the live Navbar Light was built.
- **Cross-site clipboard paste** into the Smashburger site — pasted *without*
  warnings, but only partially. Survived: structure, links, attributes, the
  embed/loader, styles and all nine SVG assets. Lost: **component identity,
  variants and all property bindings**. The target site reported zero imported
  components; property-bound settings became static placeholder content, and some
  imported classes gained unwanted breakpoint-related suffixes.

That last point is worse for this component than for a navbar: **`.faulty-terminal`
is the script's selector.** A rename to `.faulty-terminal-2` means the script never
finds the element and nothing renders.

One consolation from the blank-means-inherit design: if a flattened paste *did*
keep the class name, the component would still render correctly at the shipped
defaults — the emptied bindings simply read as "inherit". It would lose per-instance
control, not correctness.

Two mechanisms that do work:

1. **Webflow Libraries — VERIFIED WORKING (2026-08-13).** Library sharing
   preserves component identity, variants and property bindings intact. This is
   the route: publish the library from MWP Component Library, install it in the
   consuming site, place the component. No rebuild, no second parameter set.
2. **Rebuild natively per site via the API** — fallback only, now that Libraries
   is confirmed. Creates a *second* component with its own 53 property IDs, which
   then has to be kept in step on every new tunable. Roughly six calls, and fully
   specified by this document: build `section > DOM div > template > 53 carriers`,
   create the 53 string properties, bind each carrier's `text` to its property by
   matching the `data-ft-k` attribute to the property name. Element ids come back
   in template order, so the mapping is positional and needs no guesswork.

Either way the repo stays the source of truth and each site ends up with a real,
properly bound component.

---

## Outstanding

**Resolved in v1.6.1:** the reveal no longer fails invisible — after
`revealFallback` ms (default 2500) the field fades in and logs why. And the CDN
loader is now generated by the build at `webflow/faulty-terminal-loader.html`,
with an SRI hash, `crossorigin` and an `onerror` message; that hash is also what
Webflow's `register_hosted_script` requires, if the script is ever registered
rather than pasted.

`retrigger()` — **resolved in v1.6.0.** It was reported as firing on page load but
not from the debug panel. The cause was almost certainly the unguarded
`document.querySelector()` on the origin selector, which threw before the ripple
could restart; v1.6.0's `safeQuery` wrapper removed that. Confirmed working
2026-08-14. The earlier `rippleFadeStartTime` theory was wrong.


1. **Remaining swaps** — `/estimate` only (see the rollout audit above). The
   portfolio pages and project template deliberately keep plain divs. madewithpixels
   also still holds the superseded 7-prop component
   `101353df-810e-81f4-1f09-7469ee61b273`, now unused.


2. **Stray instance** on `/faulty-terminal-temp` — a second component instance
   sits directly on Body, outside the section, with all props blank. Invisible
   (defaults to `ripple: true` with nothing adding `does-ripple`) but running a
   full-viewport WebGL context. Safe to delete.

3. **Self-contained library edition** — Navbar Light ships two components, one
   self-contained and one CDN, so the library always has a build that needs no
   external request. Faulty Terminal only has the CDN edition.

