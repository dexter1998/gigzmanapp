import Link from "next/link";
import Image from "next/image";
import { PinIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

export function LandingCta() {
  return (
    <section style={{ position: "relative", overflow: "hidden", padding: "80px 24px 0" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", color: "var(--g-green-text)", fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
          <PinIcon size={13} color="var(--g-green-text)" /> Start finding clients today
        </div>
        <h2 style={{ fontSize: "clamp(30px, 5.5vw, 52px)", fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.15, margin: "0 0 16px" }}>
          Your next clients are <br />
          <span style={{ color: "var(--g-green)" }}>already nearby.</span>
        </h2>
        <p style={{ fontSize: 15, color: "var(--g-gray-500)", maxWidth: 480, margin: "0 auto 28px" }}>
          Search your area, uncover real business gaps, and start pitching with proof.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: "var(--radius-sm)", background: "var(--g-green)", color: "#fff", fontSize: 14.5, fontWeight: 700, textDecoration: "none" }}
          >
            Get Free Access →
          </Link>
          <a href="#capabilities" style={{ fontSize: 14, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "underline dotted", textUnderlineOffset: 4 }}>
            Explore local leads ›
          </a>
        </div>
      </div>

      <div style={{ position: "relative", marginTop: 64, height: 320, background: "linear-gradient(180deg, transparent, var(--g-green-mint) 55%)" }}>
        <OrigamiDecoration variant="corner-left" opacity={0.7} />
        <OrigamiDecoration variant="corner-right" opacity={0.7} />
        <Image
          aria-hidden="true"
          alt=""
          src="/landing/mantis-standing.png"
          width={1254}
          height={1254}
          style={{ position: "absolute", bottom: 0, right: "8%", width: 260, height: "auto", zIndex: 1 }}
        />
      </div>
    </section>
  );
}
