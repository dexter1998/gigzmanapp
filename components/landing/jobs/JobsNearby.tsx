"use client";

import { useState } from "react";
import Image from "next/image";
import { PinIcon } from "@/components/icons";

/** "The hottest opportunities are already nearby" — matches 06-nearby-hot-jobs.png. */
const CITIES = [
  {
    name: "Gurugram",
    count: 48,
    jobs: [
      { title: "Product Designer", company: "ZyloTech", mode: "On-site", match: 92 },
      { title: "Frontend Engineer", company: "Finova Labs", mode: "Hybrid", match: 90 },
      { title: "Backend Engineer", company: "PayHive", mode: "Hybrid", match: 84 },
    ],
  },
  {
    name: "Delhi",
    count: 52,
    jobs: [
      { title: "Data Analyst", company: "Healthify", mode: "On-site", match: 86 },
      { title: "UX Researcher", company: "Designly", mode: "Hybrid", match: 83 },
      { title: "Growth Marketer", company: "NovaMart", mode: "Remote", match: 81 },
    ],
  },
  {
    name: "Noida",
    count: 28,
    jobs: [
      { title: "QA Engineer", company: "Skyline Tech", mode: "On-site", match: 79 },
      { title: "HR Executive", company: "BrightScale", mode: "On-site", match: 76 },
      { title: "Sales Executive", company: "Zetwerk", mode: "Hybrid", match: 74 },
    ],
  },
];

export function JobsNearby() {
  const [active, setActive] = useState(0);
  const city = CITIES[active];

  return (
    <section style={{ padding: "96px 24px", background: "var(--g-white)", textAlign: "center" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 18 }}>
          <PinIcon size={13} color="var(--g-green-text)" /> NEAR YOU
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 12px" }}>
          The hottest opportunities are <span style={{ color: "var(--g-green)" }}>already nearby.</span>
        </h2>
        <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", margin: "0 0 32px" }}>
          Fresh roles across Gurugram, Delhi and Noida — ranked by recency, match and hiring momentum.
        </p>

        <div style={{ position: "relative", width: "100%", maxWidth: 760, aspectRatio: "1774 / 887", margin: "0 auto 40px" }}>
          <Image src="/landing/jobs/nearby-hot-jobs-map-cards.png" alt="" fill sizes="(max-width: 800px) 90vw, 760px" style={{ objectFit: "contain" }} priority={false} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {CITIES.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setActive(i)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: "var(--radius-pill)", cursor: "pointer",
                border: `1px solid ${i === active ? "var(--g-green)" : "var(--g-border)"}`,
                background: i === active ? "var(--g-green-mint)" : "var(--g-white)",
                color: i === active ? "var(--g-green-text)" : "var(--g-ink)",
                fontSize: 13, fontWeight: 700,
              }}
            >
              <PinIcon size={12} color={i === active ? "var(--g-green-text)" : "var(--g-gray-500)"} />
              {c.name} ({c.count})
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, textAlign: "left" }}>
          {city.jobs.map((j) => (
            <div key={j.title} style={{ background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--g-ink)", color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                {j.company.charAt(0)}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--g-ink)" }}>{j.title}</div>
              <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 10 }}>{j.company} · {city.name} · {j.mode}</div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--g-green-text)", background: "var(--g-white)", border: "1px solid var(--g-border)", padding: "3px 9px", borderRadius: "var(--radius-pill)" }}>
                {j.match}% match
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
