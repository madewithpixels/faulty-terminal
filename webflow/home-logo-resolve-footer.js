// faulty-terminal logo resolve, part 2 of 2, for v1.12.0+ (written by Claude, 30 Oct 2026; hero-only 31 Oct 2026).
// faulty-terminal runs the whole sequence on one clock - resolve, degauss, hand-off to this HTML heart, flare and
// ripple - so the debug panel (backtick) can play, scrub and tweak all of it. This script sets the options, sizes the
// heart in device pixels and starts it after first paint.
// Hero only: the hero is sticky, so the terminal shows through the whole page. If the page opens scrolled down
// (reload, back/forward, the project back button, a #link) with the content already over the heart, the field just
// fades in and the timeline jumps to its end: heart shown, no resolve, flare or ripple behind the content.
// Notes: faulty-terminal repo, Claude outputs/SITE-WIRING-logo-resolve.md
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

  d.addEventListener('faulty-terminal:ready', function (e) {
    var inst = e.detail && e.detail.instance;
    if (ft || !inst || inst.ctn !== term) return;
    ft = inst;
    requestAnimationFrame(function () { requestAnimationFrame(function () { // after first paint
      place();
      if (ft.resolveLogo && ft.logoTimeline) {
        ft.resolveLogo(); // hides the heart itself until the hand-off
        var lt = ft.logoTimeline, S = lt.schedule;
        if (!inHero(startY())) (function skip() { // let the field fade in, then jump past the resolve
          if (!lt.playing || lt.time >= S.r0 - 20) return lt.seek(S.done);
          requestAnimationFrame(skip);
        })();
      }
      show();
    }); });
  });
  addEventListener('faulty-terminal:cdn-error', show);
  setTimeout(function () { if (!ft) show(); }, 6000);
})();
