import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { OG_BACKGROUNDS } from "@/lib/og";

/**
 * Open Graph image renderer.
 *
 * One layout, ten backgrounds. Every page passes its own eyebrow, two-line headline and sub-line;
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

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  const variant = q.get("v") ?? "hero";
  const eyebrow = text(q.get("eyebrow"), 34) || "MANTIS AI";
  const line1 = text(q.get("t1"), 46) || "Find local clients.";
  const line2 = text(q.get("t2"), 46);
  const sub = text(q.get("sub"), 130);
  const urlLabel = text(q.get("url"), 48) || "mantisai.in";

  const bgFile = OG_BACKGROUNDS[variant as keyof typeof OG_BACKGROUNDS] ?? OG_BACKGROUNDS.hero;
  const bg = dataUri(readAsset(path.join("public/og", bgFile)), "image/jpeg");
  const logo = dataUri(readAsset("public/mantis-logo-wordmark.png"), "image/png");

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
            width: 640,
            height: H,
            padding: "52px 0 52px 64px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" height={34} width={140} style={{ objectFit: "contain", marginBottom: 34 }} />
            )}

            <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 1.7, color: GREEN_TEXT, marginBottom: 16 }}>
              {eyebrow.toUpperCase()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", fontSize: 50, fontWeight: 800, lineHeight: 1.14, letterSpacing: -1.4 }}>
              <div style={{ display: "flex", color: INK }}>{line1}</div>
              {line2 && <div style={{ display: "flex", color: GREEN }}>{line2}</div>}
            </div>

            {sub && (
              <div style={{ display: "flex", fontSize: 17, fontWeight: 500, lineHeight: 1.5, color: GREY, marginTop: 18, maxWidth: 480 }}>
                {sub}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", width: 26, height: 3, background: GREEN, marginBottom: 12 }} />
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: INK }}>{urlLabel}</div>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 500, color: GREY, marginTop: 4 }}>
              AI-powered local lead intelligence
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
