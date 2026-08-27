import Link from "next/link";
import Image from "next/image";
import { PinIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

export function LandingCta() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 24px",
        background: "var(--g-green-mint)",
      }}
    >
      <OrigamiDecoration variant="corner-left" opacity={0.85} width="40vw" />
      <OrigamiDecoration variant="corner-right" opacity={0.85} width="40vw" />

      <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: "var(--radius-pill)", background: "var(--g-white)", color: "var(--g-green-text)", fontSize: 12.5, fontWeight: 700, marginBottom: 22 }}>
          <PinIcon size={14} color="var(--g-green-text)" /> Start finding clients today
        </div>
        <h2 style={{ fontSize: "clamp(32px, 5.5vw, 56px)", fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.15, margin: "0 0 18px" }}>
          Your next clients are <br />
          <span style={{ color: "var(--g-green-dark)" }}>already nearby.</span>
        </h2>
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", maxWidth: 480, margin: "0 auto 32px" }}>
          Search your area, uncover real business gaps, and start pitching with proof.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 30px", borderRadius: "var(--radius-sm)", background: "var(--g-green-dark)", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none" }}
          >
            Get Free Access →
          </Link>
          <a href="#capabilities" style={{ fontSize: 15, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "underline dotted", textUnderlineOffset: 4 }}>
            Explore local leads ›
          </a>
        </div>
      </div>

      <Image
        aria-hidden="true"
        alt=""
        src="/landing/mantis-standing.png"
        width={1254}
        height={1254}
        style={{ position: "absolute", bottom: 0, right: "6%", width: "clamp(260px, 28vw, 410px)", height: "auto", zIndex: 1 }}
      />
    </section>
  );
}
