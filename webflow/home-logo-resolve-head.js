// faulty-terminal v1.11.0 logo resolve, part 1 of 2 (written by Claude, 30 Oct 2026). Hides the hero heart until
// faulty-terminal hands over to it (10s CSS failsafe) and defines the device-pixel sizing used by part 2.
(function () {
  var d = document, root = d.documentElement;
  try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('ft-lr'); } catch (e) {}
  var st = d.createElement('style');
  st.textContent = 'html.ft-lr .mwp-logo{visibility:hidden;animation:ft-lr-safety 0s linear 10s forwards}@keyframes ft-lr-safety{to{visibility:visible}}';
  d.head.appendChild(st);
  var base = null;
  // Size + place the heart in whole DEVICE pixels; returns the CSS-px pitch and size for faulty-terminal
  window.mwpLogoPlace = function (logo) {
    var dpr = window.devicePixelRatio || 1, cs = getComputedStyle;
    if (!base) { var f = logo.querySelector('.pixel'); base = { s: parseFloat(cs(f).width) || 16, g: parseFloat(cs(logo).columnGap) || 2, r: parseFloat(cs(f).borderTopLeftRadius) || 3 }; }
    var sD = Math.round(base.s * dpr), gD = Math.max(1, Math.round(base.g * dpr)), s = sD / dpr, g = gD / dpr, p = s + g, ls = logo.style;
    ls.gridTemplateColumns = 'repeat(9,' + s + 'px)'; ls.gridTemplateRows = 'repeat(7,' + s + 'px)'; ls.columnGap = ls.rowGap = g + 'px';
    ls.width = 9 * p - g + 'px'; ls.height = 7 * p - g + 'px';
    logo.querySelectorAll('.pixel').forEach(function (el) { el.style.width = el.style.height = s + 'px'; el.style.borderRadius = Math.round(base.r * dpr) / dpr + 'px'; });
    ls.translate = '0px 0px';
    var r = logo.getBoundingClientRect();
    ls.translate = Math.round(r.left * dpr) / dpr - r.left + 'px ' + (Math.round(r.top * dpr) / dpr - r.top) + 'px';
    return { pitch: p, size: s };
  };
})();
