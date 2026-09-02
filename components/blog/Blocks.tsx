import Link from "next/link";
import Image from "next/image";
import type { Block } from "@/lib/blog/blocks";
import { leadsForCity, cityLeadCount } from "@/lib/blog/db";
import { indexStats, countryRows, fill } from "@/lib/blog/stats";
import { Icon } from "./icons";

/** Turns "Very high" / "High" / "Medium" into the design's coloured intent chip. */
function intentClass(v: string) {
  const k = v.toLowerCase().replace(/\s+/g, "");
  return k === "veryhigh" ? "veryhigh" : k === "high" ? "high" : "medium";
}

/** Inline markup inside prose: **bold** and [text](/href). Deliberately tiny — a full markdown
 *  parser would ship a dependency to render two constructs we control the input for. */
function inline(raw: string, key: number, t: (s: string) => string) {
  const text = t(raw);
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={`b${key}-${i++}`}>{m[1]}</strong>);
    else parts.push(
      m[3]!.startsWith("/")
        ? <Link key={`l${key}-${i++}`} href={m[3]!}>{m[2]}</Link>
        : <a key={`l${key}-${i++}`} href={m[3]} rel="noopener">{m[2]}</a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** The country breakdown, read from the index at render time rather than pasted into a post. */
async function CountryTable({ note }: { note?: string }) {
  const rows = await countryRows();
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="rc-tablewrap">
        <table className="rc-table">
          <thead><tr><th>Country</th><th>Checked</th><th>No website</th><th>Rate</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>{r.name}</td>
                <td>{r.checked.toLocaleString("en-US")}</td>
                <td>{r.noSite.toLocaleString("en-US")}</td>
                <td>{r.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>{note}</p>}
    </div>
  );
}

/** India is the default because that is where the indexed cities are; a block for a UK or US
 *  city passes its own code. */
async function LeadsBlock({ city, heading, limit, country = "in" }: { city: string; heading: string; limit?: number; country?: string }) {
  const [rows, total] = await Promise.all([leadsForCity(city, limit ?? 4), cityLeadCount(city)]);
  if (rows.length === 0) return null;
  const cityName = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <>
      <h2 id={`leads-${city}`}>{heading}</h2>
      <p>
        Live from the same index the product searches — {total.toLocaleString("en-US")} businesses in{" "}
        {cityName} currently have an active Google listing and no website.
      </p>
      <div className="rc-leads">
        {rows.map((l) => (
          <div className="rc-lead" key={l.business_name}>
            <div className="rc-lead-top">
              <div>
                <h4>{l.business_name}</h4>
                <div className="addr">{(l.address ?? "").split(",").slice(-4, -2).join(",").trim() || cityName}</div>
              </div>
              {l.rating != null && <div className="rating">★ {l.rating.toFixed(1)}</div>}
            </div>
            <div className="rc-lead-stats">
              <div>
                <div className="k">Reviews</div>
                <div className="v">{l.review_count ?? 0}</div>
              </div>
              <div>
                <div className="k">Gap</div>
                <div className="g">No website detected</div>
              </div>
            </div>
            <div className="rc-lead-badges">
              <span className="rc-lb on">No website</span>
              {(l.review_count ?? 0) >= 50 && <span className="rc-lb on">High intent</span>}
              {l.category && <span className="rc-lb">{l.category.replace(/_/g, " ")}</span>}
            </div>
          </div>
        ))}
      </div>
      <p>
        <Link href={`/leads/website-development/${country}/${city}`}>See all {total.toLocaleString("en-US")} in {cityName} →</Link>
      </p>
    </>
  );
}

export async function Blocks({ blocks }: { blocks: Block[] }) {
  const stats = await indexStats();
  const t = (v: string) => fill(v, stats);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    switch (b.type) {
      case "h2": out.push(<h2 key={i} id={b.id}>{t(b.text)}</h2>); break;
      case "h3": out.push(<h3 key={i}>{t(b.text)}</h3>); break;
      case "prose":
        out.push(<div key={i}>{b.text.map((p, j) => <p key={j}>{inline(p, i * 100 + j, t)}</p>)}</div>);
        break;
      case "checklist":
        out.push(
          <div className="rc-checks" key={i}>
            {b.items.map((it, j) => (
              <div className="rc-check" key={j}>
                <span className="tick">✓</span>
                <div><b>{t(it.title)}</b>{it.detail && <span>: {t(it.detail)}</span>}</div>
              </div>
            ))}
          </div>
        );
        break;
      case "table":
        out.push(
          <div key={i}>
            <div className="rc-tablewrap">
              <table className="rc-table">
                <thead><tr>{b.head.map((h, j) => <th key={j}>{t(h)}</th>)}</tr></thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, k) => (
                        <td key={k}>
                          {k === r.length - 1 && /^(very high|high|medium|low)$/i.test(c)
                            ? <span className={`rc-intent ${intentClass(c)}`}>{c}</span>
                            : t(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b.note && <p style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>{t(b.note)}</p>}
          </div>
        );
        break;
      case "features":
        out.push(
          <div className="rc-features" key={i}>
            {b.items.map((f, j) => (
              <div className="rc-feature" key={j}>
                <span className="ico"><Icon name={f.icon} /></span>
                <h4>{t(f.title)}</h4>
                <p>{t(f.detail)}</p>
              </div>
            ))}
          </div>
        );
        break;
      case "steps":
        out.push(
          <div className="rc-steps" key={i}>
            {b.items.map((s, j) => (
              <div className="rc-step" key={j}>
                <span className="num">{j + 1}</span>
                <span className="ico"><Icon name={s.icon} /></span>
                <h4>{t(s.title)}</h4>
                <p>{t(s.detail)}</p>
              </div>
            ))}
          </div>
        );
        break;
      case "cta":
        out.push(
          <div className="rc-cta" key={i}>
            <div>
              <h3>{t(b.title)}</h3>
              <p>{t(b.detail)}</p>
              <Link href={b.href} className="rc-btn">{b.action} <Icon name="arrow" /></Link>
            </div>
          </div>
        );
        break;
      case "image":
        out.push(
          <figure className="rc-figure" key={i}>
            <Image src={b.src} alt={b.alt} width={b.width ?? 1200} height={b.height ?? 675}
                   sizes="(max-width: 900px) 100vw, 720px" style={{ width: "100%", height: "auto" }} />
            {(b.caption || b.credit) && (
              <figcaption>
                {b.caption}
                {b.credit && <span className="credit">{b.caption ? " · " : ""}{b.credit}</span>}
              </figcaption>
            )}
          </figure>
        );
        break;
      case "tip":
        out.push(<div className="rc-tip" key={i}><h4>{t(b.title)}</h4><p>{t(b.text)}</p></div>);
        break;
      case "quote":
        out.push(
          <blockquote className="rc-quote" key={i}>
            <p>{t(b.text)}</p>
            <cite>{b.href ? <a href={b.href} rel="noopener">{b.attribution}</a> : b.attribution}</cite>
          </blockquote>
        );
        break;
      case "countrytable":
        out.push(<CountryTable key={i} note={b.note} />);
        break;
      case "leads":
        out.push(<LeadsBlock key={i} city={b.city} heading={b.heading} limit={b.limit} country={b.country} />);
        break;
    }
  }
  return <>{out}</>;
}
