// FTCellSize (site footer, registered inline script, faulty-terminal 1.13.2+; written by Claude, 25 Nov 2026).
// Every faulty-terminal on the site takes its cell size from the Webflow Size variable "FT cell size" (Logo collection),
// whose modes follow the breakpoints. Runs before the deferred faulty-terminal script; data-ft-* attributes beat
// FaultyTerminalConfig. An element that already sets data-ft-cell-px keeps its own value.
document.querySelectorAll('[data-faulty-terminal],[class*="faulty-terminal"]').forEach(function (el) {
  if (!el.hasAttribute('data-ft-cell-px')) el.setAttribute('data-ft-cell-px', 'var(--_logo---ft-cell-size)');
});
