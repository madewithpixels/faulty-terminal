// faulty-terminal logo resolve, part 2 of 2, for v1.13.0+ (FTLogoResolveFooter 1.13.0, 25 Nov 2026; written by Claude).
// v1.13.0 lift resolve: the heart forms out of the field's own cells next to the HTML heart, each pixel lifts off the
// glass (M, W, P in turn) and glides onto its HTML pixel, and the HTML heart takes over on a frame where the two are
// identical; then the ripple. faulty-terminal runs all of it on one clock, so the debug panel (backtick) can play,
// scrub, drag and tweak every timing. This script sets the options, sizes the heart in device pixels and starts it
// after first paint.
// Hero only: the hero is sticky, so the terminal shows through the whole page. If the page opens scrolled down
// (reload, back/forward, the project back button, a #link) with the content already over the heart, the field just
// fades in and the timeline jumps to its end: heart shown, no resolve or ripple behind the content.
// Previous version (v1.12 grid-lock resolve + flare): git history of this file, FTLogoResolveFooter 1.12.3.
// Notes: faulty-terminal repo, Claude outputs/SITE-WIRING-logo-resolve.md
(function () {
  var d = document, root = d.documentElement, ft = null;
  var show = function () { root.classList.remove('ft-lr'); };
  var logo = d.querySelector('.mwp-logo');
  var term = d.querySelector('.ft-wrapper [data-faulty-terminal], .ft-wrapper [class*="faulty-terminal"]');
  if (!logo || !term || !window.mwpLogoPlace) return show();
  // data-ft-* attributes beat window.FaultyTerminalConfig whatever order the scripts run in.
  // The timings are faulty-terminal's own defaults; add data-ft-logo-* here only to override them for this page.
  [['logo-lift', '.mwp-logo'], ['origin', '.mwp-logo']].forEach(function (a) { term.setAttribute('data-ft-' + a[0], a[1]); });
  var place = function () { mwpLogoPlace(logo); if (ft && ft.liftTimeline) ft.liftTimeline.relayout(); };
  place();
  var q = 0;
  addEventListener('resize', function () { if (!q) q = requestAnimationFrame(function () { q = 0; place(); }); });

  // Where the page will sit once the browser (or the back button's restore) has scrolled it
  function startY() {
    var y = scrollY, nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
    if (location.hash.length > 1) {
      var a = d.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (a) y = Math.max(y, a.getBoundingClientRect().top + scrollY);
    }
    // reload / back-forward restore the last position; 'manual' = the project back button's restore is pending.
    // mwp-home-y is saved by the page transition script (site footer) whenever the home page is left.
    if (!y && (nav.type === 'reload' || nav.type === 'back_forward' || history.scrollRestoration === 'manual')) {
      try { y = +sessionStorage.getItem('mwp-home-y') || 0; } catch (e) {}
    }
    return y;
  }
  // In the hero = the content hasn't reached the bottom of the (sticky) heart yet
  function inHero(y) {
    var main = d.querySelector('.content-main'), lb = logo.getBoundingClientRect().bottom;
    return main ? main.getBoundingClientRect().top + scrollY - y > lb : y < innerHeight / 2;
  }

  // Start once the page has loaded (capped): Webflow builds its scroll interactions as the page becomes ready, and
  // nothing can draw meanwhile. WAIT_FOR_LOAD: 'all', 'safari' (Safari and iPhone/iPad only) or 'off'.
  var WAIT_FOR_LOAD = 'all', LOAD_CAP_MS = 2500;
  function whenLoaded(go) {
    var safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    if (WAIT_FOR_LOAD === 'off' || (WAIT_FOR_LOAD === 'safari' && !safari) || d.readyState === 'complete') return go();
    var done = false, run = function () { if (!done) { done = true; go(); } };
    addEventListener('load', function () { setTimeout(run, 0); }); // after the page's own load handlers
    setTimeout(run, LOAD_CAP_MS);
  }

  d.addEventListener('faulty-terminal:ready', function (e) {
    var inst = e.detail && e.detail.instance;
    if (ft || !inst || inst.ctn !== term) return;
    ft = inst;
    if ((e.detail && e.detail.static) || !inst.liftTimeline) return show(); // software WebGL or an older build: the heart just shows
    whenLoaded(function () { requestAnimationFrame(function () { requestAnimationFrame(function () { // after first paint
      place();
      ft.resolveLogo(); // hides the heart itself until the hand-off
      var lt = ft.liftTimeline, S = lt.schedule;
      if (!inHero(startY())) (function skip() { // let the field fade in, then jump past the resolve
        if (!lt.playing || lt.time >= S.p0 - 20) return lt.seek(S.done);
        requestAnimationFrame(skip);
      })();
      show();
    }); }); });
  });
  addEventListener('faulty-terminal:cdn-error', show);
  setTimeout(function () { if (!ft) show(); }, 6000);
})();
