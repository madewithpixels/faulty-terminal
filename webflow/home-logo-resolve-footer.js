// faulty-terminal logo resolve, part 2 of 2, for v1.12.0+ (written by Claude, 30 Oct 2026). faulty-terminal now runs the
// whole sequence on one clock - resolve, degauss, hand-off to this HTML heart, flare and ripple - so the debug panel
// (backtick) can play, scrub and tweak all of it. This script sets the options, sizes the heart in device pixels and
// starts it after first paint. Notes: faulty-terminal repo, Claude outputs/SITE-WIRING-logo-resolve.md
(function () {
  var d = document, root = d.documentElement, ft = null;
  var show = function () { root.classList.remove('ft-lr'); };
  var logo = d.querySelector('.mwp-logo');
  var term = d.querySelector('.ft-wrapper [data-faulty-terminal], .ft-wrapper [class*="faulty-terminal"]');
  if (!logo || !term || !window.mwpLogoPlace) return show();
  [['grid-lock', '.mwp-logo'], ['logo-resolve', 'true'], ['ripple-gate', 'false'], ['origin', '.mwp-logo'],
   ['logo-flare', 'true'], ['logo-ripple', 'true']].forEach(function (a) { term.setAttribute('data-ft-' + a[0], a[1]); });
  var place = function () { var g = mwpLogoPlace(logo); if (ft && ft.relayout) ft.relayout(g); };
  place();
  var q = 0;
  addEventListener('resize', function () { if (!q) q = requestAnimationFrame(function () { q = 0; place(); }); });
  d.addEventListener('faulty-terminal:ready', function (e) {
    var inst = e.detail && e.detail.instance;
    if (ft || !inst || inst.ctn !== term) return;
    ft = inst;
    requestAnimationFrame(function () { requestAnimationFrame(function () { // after first paint
      place();
      if (ft.resolveLogo && ft.logoTimeline) ft.resolveLogo(); // hides the heart itself until the hand-off
      show();
    }); });
  });
  addEventListener('faulty-terminal:cdn-error', show);
  setTimeout(function () { if (!ft) show(); }, 6000);
})();
