Round 5 changes — size reduction: 49,173 → 41,592 chars (−7,581)

Pure whitespace/comment refactor via a region-aware script; zero code-token
changes (verified by comment-stripped semantic diff against
round-5-before.html — byte-identical).

What was removed/compacted:
- Shader template string: all GLSL comments, leading indentation, blank lines.
- Panel CSS and panel innerHTML template strings: leading indentation, blank
  lines (whitespace-insensitive contexts).
- JS full-line comments: dropped, except the TUNING paste-instructions header,
  the structural-params warning, and the TUNING group comments (// ripple,
  // mwp, … — kept so the file matches what the exporter re-emits).
- Alignment padding collapsed to single spaces in TUNING, DEFAULTS, SLIDERS
  and the Program uniforms block (targeted per-line-shape regexes only — no
  blanket multi-space collapse, protecting string literals like the exporter's
  two-space indent template).
- All blank lines.

Where the rationale lives now: loop/round-1..4 critique/changes files carry
the design documentation that used to be inline.

Note: preview.html regenerated from the minified embed (43,222 chars — the
preview is local-only and has no size constraint).
