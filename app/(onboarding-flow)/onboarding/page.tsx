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
  const [flow, setFlow] = useState<{ step: number; productMode: ProductMode | null; skippedProductStep: boolean }>({
    step: 1,
    productMode: null,
    skippedProductStep: false,
  });
  const { step, productMode, skippedProductStep } = flow;
  const setStep = (next: number) => setFlow((f) => ({ ...f, step: next }));

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

  // The product step only counts toward the progress bar when it was actually shown.
  const totalSteps = (skippedProductStep ? 2 : 3) + (hasPhone === false ? 1 : 0);

  useEffect(() => {
    // Query param first (a direct /onboarding?mode=… link), then the cookie the login page set
    // before the OAuth round trip dropped the param.
    const fromUrl = searchParams.get("mode");
    const fromCookie = document.cookie.match(/(?:^|;\s*)mantis_mode=(jobs|leads)/)?.[1];
    const mode = fromUrl ?? fromCookie;
    if (mode !== "jobs" && mode !== "leads") return;
    document.cookie = "mantis_mode=; path=/; max-age=0";
    // Reads browser-only state after mount; doing it during render would desync hydration.
    // See the note on `flow` above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlow({ step: 2, productMode: mode, skippedProductStep: true });
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

  function selectProductMode(mode: ProductMode) {
    setFlow((f) => ({ ...f, productMode: mode, step: 2 }));
  }

  function selectWorkMode(mode: WorkMode) {
    setWorkMode(mode);
    setStep(3);
  }

  const step2Valid =
    workMode === "company"
      ? companyName.trim().length > 0 && name.trim().length > 0
      : personName.trim().length > 0;

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
          website: website || undefined,
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
      if (hasPhone === false) {
        setStep(4);
      } else {
        router.push("/start");
      }
    } finally {
      setSubmitting(false);
    }
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
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>What are you here to find?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                Mantis has two dashboards. You can switch between them any time from settings.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <WorkModeCard
                  icon={<SearchIcon />}
                  title="Leads"
                  desc="Local businesses that need a website — for my agency or freelance work."
                  onClick={() => selectProductMode("leads")}
                />
                <WorkModeCard
                  icon={<TableIcon />}
                  title="Jobs"
                  desc="Open roles at businesses near me, with one-click applications."
                  onClick={() => selectProductMode("jobs")}
                />
              </div>
            </>
          )}

          {step === 2 && (
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
            </>
          )}

          {step === 3 && workMode === "company" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Let&apos;s set up your workspace</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                Just the basics for now — you can fill in the rest later.
              </p>

              <Field label="Your name" value={name} onChange={setName} required />
              <Field label="Company name" value={companyName} onChange={setCompanyName} required />
              <Field label="Website (optional)" value={website} onChange={setWebsite} placeholder="yourcompany.com" />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setStep(1)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!step2Valid || submitting} onClick={handleFinish} style={primaryBtn(step2Valid && !submitting)}>
                  {submitting ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {step === 3 && workMode === "independent" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Almost there</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                Just the basics for now — you can fill in the rest later.
              </p>

              <Field label="Your name" value={personName} onChange={setPersonName} required />
              <Field label="Website (optional)" value={website} onChange={setWebsite} placeholder="yourwebsite.com" />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setStep(1)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!step2Valid || submitting} onClick={handleFinish} style={primaryBtn(step2Valid && !submitting)}>
                  {submitting ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
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

function WorkModeCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        textAlign: "left",
        padding: "18px 20px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--g-border)",
        background: "var(--g-white)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-sm)",
          background: "var(--g-green-mint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--g-ink)", marginBottom: 2 }}>{title}</span>
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
