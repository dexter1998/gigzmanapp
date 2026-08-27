import Link from "next/link";
import { ZapIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";
import { LiveMapDemo } from "./LiveMapDemo";

export function LandingHero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", padding: "72px 24px 96px" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
        <OrigamiDecoration variant="corner-left" opacity={1} width="46vw" />
        <OrigamiDecoration variant="corner-right" opacity={1} width="46vw" />
      </div>
      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            borderRadius: "var(--radius-pill)",
            background: "var(--g-green-mint)",
            color: "var(--g-green-text)",
            fontSize: 12.5,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          <ZapIcon size={13} color="var(--g-green-text)" /> AI-Powered Local Lead Intelligence
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 800,
            color: "var(--g-ink)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "0 0 20px",
            textWrap: "balance",
          }}
        >
          We find clients <span style={{ color: "var(--g-green)" }}>near you</span>.
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: "var(--g-gray-500)",
            lineHeight: 1.6,
            maxWidth: 680,
            margin: "0 auto 32px",
          }}
        >
          We find businesses without websites or with weak digital presence and deliver high-intent leads for{" "}
          <strong style={{ color: "var(--g-green-text)", fontWeight: 700 }}>tech &amp; marketing agencies</strong> near you.
        </p>

        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "15px 30px",
            borderRadius: "var(--radius-sm)",
            background: "var(--g-ink)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Start Finding Leads →
        </Link>
      </div>

      <div style={{ maxWidth: 1240, margin: "56px auto 0", position: "relative", zIndex: 1 }}>
        <LiveMapDemo />
      </div>
    </section>
  );
}
