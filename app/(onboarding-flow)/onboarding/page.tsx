"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BuildingIcon, UserIcon, TableIcon, SearchIcon } from "@/components/icons";

type WorkMode = "company" | "independent";
type ProductMode = "leads" | "jobs";

export default function OnboardingPage() {
  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Step and product mode move together, so they are one piece of state rather than three.
   *
   * The mode hint can only be read after mount (it may live in a cookie, and the server has no
   * document), so seeding it in a lazy useState initializer would render step 1 on the server and
   * step 2 on the client — a hydration mismatch. Syncing from the browser after mount is exactly
   * the "subscribe to an external system" case an effect is for; keeping it to a single setState
   * is what stops it cascading.
   */
  const [flow, setFlow] = useState<{ step: number; productMode: ProductMode | null }>({
    step: 1,
    productMode: null,
  });
  const { step, productMode } = flow;
  const setStep = (next: number) => setFlow((f) => ({ ...f, step: next }));
  // Step 1's own choice, separate from the flow's committed productMode -- lets ?mode=jobs arrive
  // with Jobs already highlighted on step 1 (still showing both options, per the actual ask)
  // without silently skipping the step the way the old skippedProductStep flag used to.
  // Leads is pre-selected: it is the only dashboard open to new accounts while jobs is closed, so
  // the step is now a "here is what you are getting, and what is coming" confirmation rather than a
  // real fork. Kept as a step instead of skipped so the Jobs card can still announce itself.
  const [pendingProductMode, setPendingProductMode] = useState<ProductMode | null>("leads");

  const [workMode, setWorkMode] = useState<WorkMode | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [personName, setPersonName] = useState("");
  const [website, setWebsite] = useState("");

  // Optional add-a-mobile-number step — only shown when the account doesn't already have one on
  // file. Saved unverified; OTP verification is deliberately skipped here for now (not offered
  // at all, not even as an extra optional step) — a later phase can add it back on top of this
  // same /api/user/phone save.
  const [hasPhone, setHasPhone] = useState<boolean | null>(null); // null = still checking
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);

  /**
   * The website from step 3, read before the dashboard opens (Mantis Scout, the same read the chat
   * does) so the first chat already knows what this business sells. Skippable at any point: the
   * read keeps going in the background (a client-side navigation does not abort the request) and
   * lands in Settings → Business profiles either way.
   */
  const [scan, setScan] = useState<null | { status: "reading" | "done" | "failed"; host: string; profile?: ScannedProfile }>(null);

  const totalSteps = 3 + (hasPhone === false ? 1 : 0);

  useEffect(() => {
    // Query param first (a direct /onboarding?mode=… link), then the cookie the login page set
    // before the OAuth round trip dropped the param.
    const fromUrl = searchParams.get("mode");
    const fromCookie = document.cookie.match(/(?:^|;\s*)mantis_mode=(jobs|leads)/)?.[1];
    const mode = fromUrl ?? fromCookie;
    // "jobs" is deliberately not honoured any more -- old links and bookmarks still carry it, and
    // it must not preselect a dashboard this account cannot be given. The cookie is cleared either
    // way so a stale one does not follow the user around.
    document.cookie = "mantis_mode=; path=/; max-age=0";
    if (mode !== "leads") return;
    // Reads browser-only state after mount; doing it during render would desync hydration.
    // See the note on `flow` above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingProductMode(mode);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.name) {
          setName((prev) => prev || s.user.name);
          setPersonName((prev) => prev || s.user.name);
        }
      })
      .catch(() => {});

    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => setHasPhone(Boolean(d?.profile?.phone)))
      .catch(() => setHasPhone(true)); // fail closed — don't block finishing onboarding over this
  }, []);

  function confirmProductMode() {
    if (!pendingProductMode) return;
    setFlow({ step: 2, productMode: pendingProductMode });
  }

  function selectWorkMode(mode: WorkMode) {
    setWorkMode(mode);
    setStep(3);
  }

  const step2Valid =
    workMode === "company"
      ? companyName.trim().length > 0 && name.trim().length > 0
      : personName.trim().length > 0;

  const isJobs = productMode === "jobs";

  async function handleFinish() {
    setSubmitting(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workMode,
          name: workMode === "company" ? name : personName,
          companyName: workMode === "company" ? companyName : undefined,
          personName: workMode === "independent" ? personName : undefined,
          website: isJobs ? undefined : website || undefined,
        }),
      });
      // Saved separately from the onboarding payload: dashboard_mode lives on user_profiles and
      // the onboarding route writes the agency/freelancer profile tables, so folding it in there
      // would mean teaching that route about a field it has nothing else to do with.
      if (productMode) {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dashboard_mode: productMode }),
        }).catch(() => {
          /* defaults to leads — recoverable from the settings dropdown */
        });
      }
      if (!isJobs && website.trim()) {
        void scanWebsite(website.trim(), workMode === "company" ? companyName : personName);
      } else {
        afterScan();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function afterScan() {
    if (hasPhone === false) {
      setScan(null);
      setStep(4);
    } else {
      router.push("/start");
    }
  }

  async function scanWebsite(site: string, business: string) {
    const host = site.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
    setScan({ status: "reading", host });
    try {
      const res = await fetch("/api/v2/business-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: site, business }),
      });
      const d = (await res.json().catch(() => null)) as { profile?: ScannedProfile | null; siteFailed?: boolean } | null;
      const p = d?.profile;
      const usable = !!p && !d?.siteFailed && (p.services.length > 0 || p.targetTrades.length > 0 || (p.partnerTrades?.length ?? 0) > 0);
      // Skipped while reading: the result is saved server-side, nothing more to show here.
      setScan((cur) => (cur ? { status: usable ? "done" : "failed", host, profile: p ?? undefined } : cur));
    } catch {
      setScan((cur) => (cur ? { status: "failed", host } : cur));
    }
  }

  function skipScan() {
    setScan(null);
    afterScan();
  }

  async function saveMobileAndFinish() {
    setPhoneError("");
    setPhoneBusy(true);
    try {
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhoneError(data.error ?? "Couldn't save that number");
        return;
      }
      router.push("/start");
    } finally {
      setPhoneBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--g-cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i < step ? "var(--g-green)" : "var(--g-border)",
              }}
            />
          ))}
        </div>

        <div style={{ background: "var(--g-white)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 32 }}>
          {scan && <ScanPanel scan={scan} onContinue={skipScan} />}

          {!scan && step === 1 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>What are you here to find?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                Leads is live today. Jobs is coming back soon — we&apos;ll let you know.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <WorkModeCard
                  icon={<SearchIcon />}
                  title="Leads"
                  desc="Local businesses that need a website — for my agency or freelance work."
                  onClick={() => setPendingProductMode("leads")}
                  selected={pendingProductMode === "leads"}
                />
                <WorkModeCard
                  icon={<TableIcon />}
                  title="Jobs"
                  desc="Open roles at businesses near me, with one-click applications."
                  onClick={() => {}}
                  badge="Coming soon"
                  disabled
                />
              </div>

              <button
                type="button"
                disabled={!pendingProductMode}
                onClick={confirmProductMode}
                style={{ ...primaryBtn(!!pendingProductMode), width: "100%", marginTop: 20 }}
              >
                Continue →
              </button>
            </>
          )}

          {!scan && step === 2 && !isJobs && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>How will you use Mantis?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                This helps us shape your workspace around how you actually operate.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <WorkModeCard
                  icon={<BuildingIcon />}
                  title="For my company"
                  desc="Find opportunities for my team."
                  onClick={() => selectWorkMode("company")}
                />
                <WorkModeCard
                  icon={<UserIcon />}
                  title="Independently"
                  desc="Find opportunities for myself or my clients."
                  onClick={() => selectWorkMode("independent")}
                />
              </div>
              <button type="button" onClick={() => setStep(1)} style={{ ...secondaryBtn, width: "100%", marginTop: 12 }}>
                Back
              </button>
            </>
          )}

          {!scan && step === 2 && isJobs && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Where are you at?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                This just shapes how often we surface new roles — not who can see your profile.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <WorkModeCard
                  icon={<SearchIcon />}
                  title="Actively looking"
                  desc="I want to apply soon — show me every good match."
                  onClick={() => selectWorkMode("independent")}
                />
                <WorkModeCard
                  icon={<UserIcon />}
                  title="Just exploring"
                  desc="I'm curious what's out there — no rush."
                  onClick={() => selectWorkMode("independent")}
                />
              </div>
              <button type="button" onClick={() => setStep(1)} style={{ ...secondaryBtn, width: "100%", marginTop: 12 }}>
                Back
              </button>
            </>
          )}

          {!scan && step === 3 && workMode === "company" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Let&apos;s set up your workspace</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                Just the basics for now — you can fill in the rest later.
              </p>

              <Field label="Your name" value={name} onChange={setName} required />
              <Field label="Company name" value={companyName} onChange={setCompanyName} required />
              <Field label="Website (optional)" value={website} onChange={setWebsite} placeholder="yourcompany.com" />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!step2Valid || submitting} onClick={handleFinish} style={primaryBtn(step2Valid && !submitting)}>
                  {submitting ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {!scan && step === 3 && workMode === "independent" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Almost there</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                Just the basics for now — you can fill in the rest later.
              </p>

              <Field label="Your name" value={personName} onChange={setPersonName} required />
              {!isJobs && (
                <Field label="Website (optional)" value={website} onChange={setWebsite} placeholder="yourwebsite.com" />
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!step2Valid || submitting} onClick={handleFinish} style={primaryBtn(step2Valid && !submitting)}>
                  {submitting ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {!scan && step === 4 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Add a mobile number?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                Optional — helps us reach you if you ever need account help. You can skip this.
              </p>

              <Field label="Mobile number" value={phoneInput} onChange={setPhoneInput} placeholder="10-digit mobile number" />
              {phoneError && <p style={{ fontSize: 12, color: "#b45309", margin: "0 0 10px" }}>{phoneError}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => router.push("/start")} style={secondaryBtn}>
                  Skip
                </button>
                <button
                  type="button"
                  disabled={phoneInput.trim().length < 10 || phoneBusy}
                  onClick={saveMobileAndFinish}
                  style={primaryBtn(phoneInput.trim().length >= 10 && !phoneBusy)}
                >
                  {phoneBusy ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type ScannedProfile = { name: string; summary: string; services: string[]; targetTrades: string[]; targetAreas: string[]; sellsTo?: string | null; partnerTrades?: string[] };

function ScanPanel({ scan, onContinue }: { scan: { status: "reading" | "done" | "failed"; host: string; profile?: ScannedProfile }; onContinue: () => void }) {
  const p = scan.profile;
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>
        {scan.status === "reading" ? `Reading ${scan.host}` : scan.status === "done" ? `Here's what we learned` : `We couldn't open ${scan.host}`}
      </h1>
      <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px", lineHeight: 1.5 }}>
        {scan.status === "reading"
          ? "Mantis is reading your website to learn what you sell and who buys it, so your first search is planned around it. Takes about 20 seconds."
          : scan.status === "done"
            ? "Saved as your business profile. Mantis uses it to plan every search — you can edit it in Settings → Business profiles."
            : "It may be down or blocking automated visits. No problem — tell Mantis in one line what you sell in the chat, and it will set up your profile."}
      </p>

      {scan.status === "reading" && (
        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {["Opening the homepage", "Reading service and about pages", "Working out who buys from you"].map((t, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--g-ink)" }}>
              <span className="ob-scan-dot" style={{ animationDelay: `${i * 0.35}s` }} />
              {t}
            </div>
          ))}
          <style>{`.ob-scan-dot{width:8px;height:8px;border-radius:50%;background:var(--g-green);opacity:.25;animation:obScan 1.2s ease-in-out infinite}@keyframes obScan{50%{opacity:1}}@media (prefers-reduced-motion:reduce){.ob-scan-dot{animation:none;opacity:.6}}`}</style>
        </div>
      )}

      {scan.status === "done" && p && (
        <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>{p.name}</div>
          <div style={{ fontSize: 13, color: "var(--g-ink)", lineHeight: 1.5 }}>{p.summary}</div>
          {p.services.length > 0 && <ScanRow label="Sells" items={p.services.slice(0, 5)} />}
          {p.targetTrades.length > 0 && <ScanRow label="Likely buyers" items={p.targetTrades.slice(0, 5)} />}
          {p.sellsTo === "consumers" && (p.partnerTrades?.length ?? 0) > 0 && <ScanRow label="Partners to reach your customers" items={p.partnerTrades!.slice(0, 4)} />}
          {p.sellsTo === "consumers" && (
            <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.5 }}>
              You sell to consumers. Mantis finds businesses, not individual customers — it will find partners and vendors for you instead.
            </div>
          )}
          {p.targetAreas.length > 0 && <ScanRow label="Serves" items={p.targetAreas.slice(0, 4)} />}
        </div>
      )}

      <button type="button" onClick={onContinue} style={scan.status === "reading" ? { ...secondaryBtn, width: "100%" } : { ...primaryBtn(true), width: "100%" }}>
        {scan.status === "reading" ? "Skip — finish in the background" : "Continue →"}
      </button>
    </>
  );
}

function ScanRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((x) => (
          <span key={x} style={{ fontSize: 12, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: "var(--g-gray-100)", color: "var(--g-ink)" }}>{x}</span>
        ))}
      </div>
    </div>
  );
}

function WorkModeCard({
  icon, title, desc, onClick, selected, badge, disabled,
}: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; selected?: boolean;
  /** Small pill beside the title -- currently only "Coming soon" on the closed Jobs card. */
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        textAlign: "left",
        padding: "18px 20px",
        borderRadius: "var(--radius-md)",
        border: selected ? "2px solid var(--g-green)" : "1px solid var(--g-border)",
        background: selected ? "var(--g-green-mint)" : "var(--g-white)",
        // Dimmed rather than hidden: the card still says what Jobs is, so someone who came looking
        // for it learns it exists and is coming back, instead of wondering if they misremembered.
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-sm)",
          background: selected ? "var(--g-white)" : "var(--g-green-mint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "var(--g-ink)", marginBottom: 2 }}>
          {title}
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 7px", borderRadius: "var(--radius-pill)", background: "var(--g-gray-100)", color: "var(--g-gray-500)", whiteSpace: "nowrap" }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.4 }}>{desc}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "var(--g-amber)" }}> *</span>}
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 6 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  fontSize: 13.5,
  color: "var(--g-ink)",
  background: "var(--g-white)",
  outline: "none",
};

// Real horizontal padding always, not just when a sibling flex button happens to stretch this
// one via flex:1 — that was the actual bug (padding: "12px 0" left this button visibly cramped
// whenever it rendered alone, outside a flex row, since flex:1 does nothing without a flex
// container to stretch within).
function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "12px 24px",
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: enabled ? "var(--g-green)" : "var(--g-gray-100)",
    color: enabled ? "#fff" : "var(--g-gray-500)",
    fontSize: 14,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

const secondaryBtn: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
