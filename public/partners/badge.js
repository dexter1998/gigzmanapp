/**
 * Mantis partner badge — optional script embed.
 *
 * The plain <img> snippet on https://mantisai.in/partner/brand-kit is the recommended way to add
 * the badge and the one most partners should use: it needs no JavaScript, survives a strict CSP,
 * and costs one cached image. This exists for partners who would rather drop in a single tag and
 * never touch the markup again — the badge art can then change on our side without them editing
 * anything.
 *
 * Usage:
 *   <script src="https://mantisai.in/partners/badge.js" data-variant="light" data-width="360"></script>
 *
 * The tag must NOT be async or defer: the badge is written where the tag sits, which relies on
 * document.currentScript. If you need async, put an empty <div data-mantis-badge></div> where the
 * badge should go and the script will fill that instead.
 *
 * No cookies, no tracking pixel, no network call beyond the image itself.
 */
(function () {
  "use strict";

  var ORIGIN = "https://mantisai.in";
  var VARIANTS = { light: 1, dark: 1, transparent: 1 };

  // Captured at parse time: by the time any later callback runs, currentScript is null again.
  var self = document.currentScript;

  function build(cfg) {
    var variant = VARIANTS[cfg.variant] ? cfg.variant : "light";
    var width = parseInt(cfg.width, 10);
    if (!width || width < 120 || width > 720) width = 360;

    var a = document.createElement("a");
    a.href = ORIGIN + "/partner";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", "Mantis Leads Partner");
    a.style.display = "inline-block";
    a.style.lineHeight = "0";

    var img = document.createElement("img");
    img.src = ORIGIN + "/partners/badge/leads-partner-" + variant + ".png";
    img.alt = "Mantis Leads Partner";
    // Intrinsic size is the asset's own 720x192, so the box is reserved before the image lands and
    // the badge cannot shift the footer around it while loading.
    img.width = width;
    img.height = Math.round((width * 192) / 720);
    img.loading = "lazy";
    img.decoding = "async";
    img.style.display = "block";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.border = "0";

    a.appendChild(img);
    return a;
  }

  function mount() {
    // A placeholder wins when the script tag itself carries no configuration.
    //
    // The obvious version of this -- "use the placeholder only when currentScript is null" -- is
    // wrong, and quietly so: document.currentScript is set for async classic scripts too, not just
    // synchronous ones. An async tag with a configured placeholder therefore never reached the
    // fallback and rendered the default light badge next to the <script> instead of the
    // transparent one inside the placeholder. Deciding on "did the tag configure itself" instead
    // handles both placements without having to ask how the script was loaded.
    var cfgOnScript = self && self.dataset && (self.dataset.variant || self.dataset.width);
    if (!cfgOnScript) {
      var slot = document.querySelector("[data-mantis-badge]:not([data-mantis-badge-done])");
      if (slot) {
        slot.setAttribute("data-mantis-badge-done", "");
        slot.appendChild(build(slot.dataset || {}));
        return;
      }
    }
    if (!self || !self.parentNode) return;
    self.parentNode.insertBefore(build((self.dataset) || {}), self);
  }

  // A placeholder further down the page does not exist yet while the parser is still working, so a
  // script in <head> has to wait for it.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
