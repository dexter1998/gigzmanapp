"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Builds the partner's announcement graphic in the browser.
 *
 * The asset started life as a flat PNG with a dashed "Place your Logo" box, which meant every
 * partner had to open a design tool before they could post anything -- the single biggest reason a
 * graphic like this goes unused. The box has been painted out of the artwork (see
 * public/partners/social/announcement-base.webp) and the slot it occupied is filled here instead.
 *
 * Everything happens on a canvas in the partner's own browser. Their logo is never uploaded, which
 * is both the fastest way to do it and the answer to the obvious question about what we do with
 * their file: nothing, we never receive it.
 */

// The slot the dashed box used to occupy, in the artwork's own 1672x941 coordinates.
const ART_W = 1672;
const ART_H = 941;
const SLOT = { x: 958, y: 203, w: 536, h: 262 };
const SLOT_PAD = 34;

export function AnnouncementMaker({ baseSrc }: { baseSrc: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseRef = useRef<HTMLImageElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const [baseReady, setBaseReady] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  /**
   * `forExport` is the whole reason this takes an argument. Painting out the original's dashed box
   * left the right-hand side simply empty, which reads as an unfinished design rather than as a
   * space waiting for something -- so the preview draws its own hint there. That hint must never
   * reach the downloaded file, and the cheapest way to guarantee that is to redraw without it at
   * the moment of export rather than trying to erase it afterwards.
   */
  const draw = useCallback((forExport = false) => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ART_W, ART_H);
    ctx.drawImage(base, 0, 0, ART_W, ART_H);

    const logo = logoRef.current;
    if (!logo) {
      if (!forExport) {
        ctx.save();
        ctx.strokeStyle = "rgba(25, 31, 23, 0.22)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 9]);
        const r = 14;
        const { x, y, w, h } = SLOT;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(25, 31, 23, 0.42)";
        ctx.font = "600 26px ui-sans-serif, system-ui, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Your logo here", x + w / 2, y + h / 2);
        ctx.restore();
      }
      return;
    }

    // Contain, never cover: a partner's logo gets letterboxed into the slot rather than cropped or
    // stretched. Scaling up past natural size is allowed -- a small logo should still fill its
    // space -- but capped, so a 60px favicon does not become a blurry banner.
    const maxW = SLOT.w - SLOT_PAD * 2;
    const maxH = SLOT.h - SLOT_PAD * 2;
    const fit = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const scale = Math.min(fit, 3);
    const w = logo.naturalWidth * scale;
    const h = logo.naturalHeight * scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, SLOT.x + (SLOT.w - w) / 2, SLOT.y + (SLOT.h - h) / 2, w, h);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      baseRef.current = img;
      setBaseReady(true);
    };
    img.onerror = () => setError("Could not load the artwork. Reload the page and try again.");
    img.src = baseSrc;
  }, [baseSrc]);

  useEffect(() => {
    if (baseReady) draw();
  }, [baseReady, draw]);


  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      setError("Use a PNG, JPG, WEBP or SVG file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("That file is over 8MB. A logo should be far smaller than that.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Revoked only after decode: releasing the blob before the image is read leaves an empty
      // slot on some browsers, which looks exactly like the upload silently failing.
      logoRef.current = img;
      setHasLogo(true);
      setFileName(file.name);
      draw();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("That image could not be read. If it is an SVG, try a PNG export instead.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(true);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mantis-official-lead-partner.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      draw(); // put the preview hint back
    }, "image/png");
  }

  function clear() {
    logoRef.current = null;
    setHasLogo(false);
    setFileName(null);
    draw();
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={ART_W}
        height={ART_H}
        aria-label="Your announcement graphic"
        style={{ display: "block", width: "100%", height: "auto", background: "var(--g-cream)" }}
      />

      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--g-ink)", margin: 0 }}>
            Official Lead Partner
          </h3>
          <span style={{ fontSize: 12, color: "var(--g-gray-500)" }}>1672 × 941 · 16:9</span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", margin: "0 0 18px", lineHeight: 1.6 }}>
          Add your logo and download — no design tool needed. A transparent PNG looks best; the space
          is light, so a white logo will not show up. Your file stays in your browser: it is never
          uploaded to us.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={pickBtn}>
            {hasLogo ? "Change logo" : "Upload your logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={onPick}
              style={{ display: "none" }}
            />
          </label>

          <button
            type="button"
            onClick={download}
            disabled={!baseReady}
            style={{
              ...primaryBtn,
              opacity: baseReady ? 1 : 0.5,
              cursor: baseReady ? "pointer" : "default",
            }}
          >
            Download PNG
          </button>

          {hasLogo && (
            <button type="button" onClick={clear} style={linkBtn}>
              Remove
            </button>
          )}

          {fileName && (
            <span style={{ fontSize: 12, color: "var(--g-gray-500)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fileName}
            </span>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 12.5, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "8px 12px", borderRadius: "var(--radius-sm)", margin: "12px 0 0" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const pickBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", padding: "10px 18px",
  borderRadius: "var(--radius-pill)", border: "1px solid var(--g-border)",
  background: "var(--g-white)", color: "var(--g-ink)", fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 20px", borderRadius: "var(--radius-pill)", border: "none",
  background: "var(--g-ink)", color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
};

const linkBtn: React.CSSProperties = {
  padding: "10px 4px", border: "none", background: "none", cursor: "pointer",
  color: "var(--g-gray-500)", fontSize: 12.5, fontWeight: 600, textDecoration: "underline",
};
