Round 5 critique — file exceeds Webflow's embed character limit

(a) Weakness
The embed is 49,173 characters and the owner reports being ~100 over Webflow's
limit. Four rounds of features have accumulated explanatory comments, aligned
column padding (TUNING, SLIDERS, Program uniforms), decorative section
dividers, indented multi-line template strings (shader, panel CSS, panel
HTML), and blank lines — none of which affect behaviour but all of which
count against the limit.

(b) Proposed change
A pure size-reduction pass, no behavioural changes, no identifier renames:
- Shader template string: strip all GLSL comments (full-line and trailing —
  safe, GLSL has no string literals), leading indentation, and blank lines.
- Panel CSS / panel innerHTML template strings: strip leading indentation and
  blank lines (whitespace-insensitive contexts).
- JS: drop full-line comments except the two load-bearing headers (TUNING
  paste instructions, structural-params warning) and the TUNING group
  comments (the exporter re-emits these, keeping file and export consistent).
- Collapse alignment padding to single spaces in TUNING, SLIDERS and the
  Program uniforms block only (targeted regexes keyed to those line shapes —
  never a blanket multi-space collapse, which would corrupt string literals
  such as the exporter's two-space indent template).
- Remove blank lines.
Rationale for keeping rich rationale externally: every design decision is
already recorded in loop/round-N-*.md, so in-file prose is redundant.

(c) Risks / regressions
- A blanket whitespace collapse could alter string literals (exporter output
  format, panel HTML). Mitigated by only stripping line-leading whitespace
  inside template strings and only collapsing padding on structurally matched
  lines (TUNING entries, SLIDERS rows, uniform entries).
- Stripping GLSL trailing comments must not eat the heart bitmap row
  annotations' code (comments only follow complete statements — verified by
  re-parsing the shader afterwards).
- Reduced in-file documentation makes future rounds slightly harder to read;
  accepted trade-off, mitigated by loop/ records and the protocol's mandatory
  full-file read each round.
- Verification: node --check, GLSL parse, exporter simulation, and a
  whitespace-insensitive semantic diff against round-5-before.html.
