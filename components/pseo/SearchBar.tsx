import Link from "next/link";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";

/**
 * The search rail under the nav: service, location, lead type.
 *
 * Rendered as links, not a form. Each option corresponds to a page that already exists, so this is
 * navigation through the hierarchy rather than a query builder — and nothing here can produce a
 * crawlable URL that isn't a real page.
 */
export function SearchBar({
  serviceName,
  cityName,
  serviceHref,
  cityHref,
}: {
  serviceName: string;
  cityName: string;
  serviceHref: string;
  cityHref: string;
}) {
  return (
    <div style={{ background: "var(--g-green-mint)", borderBottom: "1px solid var(--g-border)" }}>
      <div
        style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "center" }}
        className="pseo-searchbar"
      >
        <Field label="Service" value={serviceName} href={serviceHref} />
        <Field label="Location" value={cityName} href={cityHref} />
        <Field label="Lead type" value="All opportunities" />
        <Link
          href="/login"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: "var(--g-ink)", color: "#fff",
            borderRadius: "var(--radius-md)", padding: "13px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <SearchIcon color="#fff" /> Search Leads
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--g-ink)" }}>{value}</span>
        <ChevronDownIcon size={13} />
      </div>
    </>
  );
  const style: React.CSSProperties = {
    background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)",
    padding: "8px 14px", textDecoration: "none", display: "block",
  };
  return href ? <Link href={href} style={style}>{inner}</Link> : <div style={style}>{inner}</div>;
}
