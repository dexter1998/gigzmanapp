import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { OG_BACKGROUNDS } from "@/lib/og";

/**
 * Open Graph image renderer.
 *
 * One layout, eleven backgrounds. Every page passes its own eyebrow and two-line headline;
 * the art is chosen by `v` so a pricing card looks like pricing and a lead page looks like the lead
 * market, without a designer touching anything when a new city publishes.
 *
 * Text arrives in the query string, so it is capped and rendered as plain text — this endpoint is
 * public, and an uncapped one is an open invitation to render someone else's words on our branding.
 */

export const runtime = "nodejs";
export const revalidate = 86400;

const W = 1200;
const H = 630;

const INK = "#1a1f2b";
const GREEN = "#7cb342";
const GREEN_TEXT = "#4e7a1f";
const GREY = "#6b7280";
const CREAM = "#faf9f5";

function readAsset(rel: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel));
  } catch {
    return null;
  }
}

function dataUri(buf: Buffer | null, mime: string): string | null {
  return buf ? `data:${mime};base64,${buf.toString("base64")}` : null;
}

/** Query text is untrusted and unbounded; clip it rather than let a long string reflow the card. */
function text(v: string | null, max: number): string {
  return (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Headline size that keeps the design's two-line promise.
 *
 * The card is laid out as exactly two headline lines with the CTA beneath. At a fixed 62px a
 * line longer than ~17 characters wrapped, which silently turned a two-line headline into three
 * and pushed the CTA down — "Reach the right people." was rendering as two lines on the
 * homepage card. Rather than force every caller to count characters, the size is derived from
 * the longest line so any copy fits on one line, and the lines are set nowrap so it cannot
 * degrade quietly again.
 *
 * 0.54em is the measured average advance of Plus Jakarta Sans ExtraBold; the letter-spacing is
 * subtracted per character because it is negative here and materially narrows long strings.
 */
const TEXT_WIDTH = 570;
const LETTER_SPACING = -2.2;
function headlineSize(...lines: string[]): number {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fitted = (TEXT_WIDTH / longest - LETTER_SPACING) / 0.54;
  return Math.round(Math.max(34, Math.min(62, fitted)));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  // `d` is a single base64url-encoded payload (see lib/og.ts for why it is one parameter).
  // The individual parameters remain supported so that already-shared card URLs keep rendering
  // and so the endpoint stays hand-testable in a browser.
  let p = q;
  const d = q.get("d");
  if (d) {
    try {
      const decoded = JSON.parse(Buffer.from(d, "base64url").toString("utf8")) as Record<string, string | undefined>;
      p = new URLSearchParams(
        Object.entries(decoded).filter(([, v]) => typeof v === "string" && v.length > 0) as [string, string][]
      );
    } catch {
      // Undecodable payload: fall through to the defaults rather than fail the image.
    }
  }

  const variant = p.get("v") ?? "hero";
  const eyebrow = text(p.get("eyebrow"), 34) || "MANTIS AI";
  const line1 = text(p.get("t1"), 46) || "Find local clients.";
  const line2 = text(p.get("t2"), 46);
  const cta = text(p.get("cta"), 36);
  const urlLabel = text(p.get("url"), 48) || "mantisai.in";

  const bgFile = OG_BACKGROUNDS[variant as keyof typeof OG_BACKGROUNDS] ?? OG_BACKGROUNDS.hero;
  const bg = dataUri(readAsset(path.join("public/og", bgFile)), "image/jpeg");
  const logo = dataUri(readAsset("public/mantis-logo-wordmark.png"), "image/png");
  // The jobs card advertises finding a role, not finding a client -- the one line of copy on
  // every variant that isn't passed in per-page has to say which product this actually is.
  const tagline = variant === "jobs" ? "AI-powered local job intelligence" : "AI-powered local lead intelligence";

  const [w500, w700, w800] = ["500", "700", "800"].map((w) =>
    readAsset(path.join("app/api/og/fonts", `pjs-${w}.woff`))
  );

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: CREAM, fontFamily: "Jakarta" }}>
        {/* The art already carries its own cream field on the left, so it sits full-bleed and the
            copy lands on the empty half rather than needing a scrim over it. */}
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" width={W} height={H} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
        )}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 600,
            height: H,
            padding: "54px 0 54px 64px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" height={34} width={140} style={{ objectFit: "contain", marginBottom: 34 }} />
            )}

            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 1.9, color: GREEN_TEXT, marginBottom: 18 }}>
              {eyebrow.toUpperCase()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", fontSize: headlineSize(line1, line2), fontWeight: 800, lineHeight: 1.08, letterSpacing: LETTER_SPACING }}>
              <div style={{ display: "flex", color: INK, whiteSpace: "nowrap" }}>{line1}</div>
              {line2 && <div style={{ display: "flex", color: GREEN, whiteSpace: "nowrap" }}>{line2}</div>}
            </div>

            {cta && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  marginTop: 30,
                  background: INK,
                  color: "#fff",
                  fontSize: 21,
                  fontWeight: 700,
                  padding: "15px 30px",
                  borderRadius: 999,
                }}
              >
                {cta}
              </div>
            )}

          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", width: 26, height: 3, background: GREEN, marginBottom: 12 }} />
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: INK }}>{urlLabel}</div>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 500, color: GREY, marginTop: 4 }}>
              {tagline}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        ...(w500 ? [{ name: "Jakarta", data: w500 as unknown as ArrayBuffer, weight: 500 as const, style: "normal" as const }] : []),
        ...(w700 ? [{ name: "Jakarta", data: w700 as unknown as ArrayBuffer, weight: 700 as const, style: "normal" as const }] : []),
        ...(w800 ? [{ name: "Jakarta", data: w800 as unknown as ArrayBuffer, weight: 800 as const, style: "normal" as const }] : []),
      ],
      headers: { "Cache-Control": "public, max-age=0, s-maxage=604800, immutable" },
    }
  );
}
