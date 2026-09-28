/**
 * Founder widget loader.
 *
 * Drop one script tag on any site:
 *
 *   <script src="https://mantisai.in/widget.js" data-site="gigzman" async></script>
 *
 * Everything visible lives in an iframe served from this app, so the host page's CSS, framework
 * and build cannot affect it and it cannot affect them. The only thing rendered on the host page
 * is the launcher button, and that is mounted inside a shadow root for the same reason — a site
 * with `button { width: 100% }` in its stylesheet must not be able to stretch it across the page.
 *
 * Themed entirely through data-* attributes, because the point of this file is that a new site is
 * a different script tag, not a different build:
 *
 *   data-site          required. Which site this is, in the admin inbox.
 *   data-accent        primary colour            (#648b1c)
 *   data-accent-text   text on the accent        (#ffffff)
 *   data-radius        corner radius in px       (16)
 *   data-title         header text               ("Talk to Founder")
 *   data-greeting      one-line intro
 *   data-logo          https logo url
 *   data-avatar        https headshot url (defaults to the founder's)
 *   data-avatars       comma-separated https image urls
 *   data-position      "right" | "left"          (right)
 *   data-offset        distance from the edge px (24)
 *   data-label         launcher button text      (= data-title)
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var d = script.dataset;
  var site = (d.site || "").trim();
  if (!site) {
    // Loud on the console rather than silent: a widget that simply never appears is the hardest
    // kind of embed bug to notice on a site you rarely open.
    console.warn("[founder-widget] data-site is required; widget not mounted.");
    return;
  }

  // The iframe origin is wherever this script was served from, so a self-hosted copy points at its
  // own backend without editing anything.
  var base = new URL(script.src, location.href).origin;

  var accent = d.accent || "#648b1c";
  var accentText = d.accentText || "#ffffff";
  var radius = parseInt(d.radius || "16", 10);
  var position = d.position === "left" ? "left" : "right";
  var offset = parseInt(d.offset || "24", 10);
  var label = d.label || d.title || "Talk to Founder";

  var params = new URLSearchParams({ site: site, origin: location.origin });
  ["accent", "accentText", "radius", "title", "greeting", "logo", "avatar", "avatars"].forEach(function (k) {
    if (d[k]) params.set(k, d[k]);
  });

  var host = document.createElement("div");
  host.setAttribute("data-founder-widget", site);
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial}",
    ".wrap{position:fixed;bottom:" + offset + "px;" + position + ":" + offset + "px;z-index:2147483000;",
    "font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}",
    ".btn{display:flex;align-items:center;gap:8px;height:48px;padding:0 18px;border:none;cursor:pointer;",
    "border-radius:999px;background:" + accent + ";color:" + accentText + ";font-size:14px;font-weight:700;",
    "box-shadow:0 6px 20px rgba(16,18,20,.22);transition:transform .15s ease}",
    ".btn:hover{transform:translateY(-1px)}",
    // The same stacking as the launcher, not the default. Without it the iframe sat at z-index
    // auto and the host page's own content drew over it — confirmed live on the Mantis landing
    // page, where a decorative graphic covered the panel's footer.
    ".panel{position:fixed;z-index:2147483000;bottom:" + (offset + 60) + "px;" + position + ":" + offset + "px;",
    "width:380px;height:min(620px,calc(100vh - " + (offset * 2 + 70) + "px));border:none;",
    "border-radius:" + radius + "px;background:#fff;box-shadow:0 18px 50px rgba(16,18,20,.28);",
    "opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .16s ease,transform .16s ease}",
    ".panel.open{opacity:1;pointer-events:auto;transform:none}",
    // Applies at every width, not just mobile: the panel sits above the launcher, so leaving the
    // button on screen while open just puts a second, contradictory control under the frame.
    ".wrap.hidden .btn{display:none}",
    // A 380px panel floating 24px from the edge of a 360px phone is a panel with 0px of content.
    "@media (max-width:480px){.panel{inset:0;width:100%;height:100%;border-radius:0}}",
  ].join("");
  root.appendChild(style);

  var wrap = document.createElement("div");
  wrap.className = "wrap";

  var btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.textContent = label;
  btn.setAttribute("aria-label", label);

  var frame = null;
  var open = false;

  function ensureFrame() {
    if (frame) return frame;
    frame = document.createElement("iframe");
    frame.className = "panel";
    frame.title = label;
    // Created on first click, not on page load: an embed that costs a request and a React boot on
    // every page view of every site is a tax paid by everyone to serve the few who click.
    frame.src = base + "/widget?" + params.toString();
    root.appendChild(frame);
    return frame;
  }

  function toggle(next) {
    open = next === undefined ? !open : next;
    var f = ensureFrame();
    // A frame off-screen in the layout still takes the click, so the class does both.
    requestAnimationFrame(function () { f.classList.toggle("open", open); });
    wrap.classList.toggle("hidden", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  btn.addEventListener("click", function () { toggle(); });

  // The iframe asks to be closed from its own header/back button — it cannot reach the parent DOM
  // itself, and the origin check is what stops any other frame on the page from doing it.
  window.addEventListener("message", function (e) {
    if (e.origin !== base || !e.data || e.data.source !== "founder-widget") return;
    if (e.data.type === "close") toggle(false);
  });

  wrap.appendChild(btn);
  root.appendChild(wrap);
})();
