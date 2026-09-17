import { DIRECTORIES, liveListings, linkedDirectories, submittedTo } from "@/lib/directories";

/**
 * A quiet strip of the directories Mantis Ai is listed on, scrolling on a loop.
 *
 * It renders only verified listings. Until at least two exist the strip stays hidden and the
 * section falls back to a single line of outbound links — because an empty marquee reads as a
 * claim nobody can back, and a row of logos from places we have merely applied to is exactly the
 * kind of social proof we do not invent.
 *
 * The loop is CSS only: the list is rendered twice and translated by half its width, so it never
 * jumps. `prefers-reduced-motion` turns the animation off and leaves a normal wrapped row.
 */
export function LandingDirectories() {
  const live = liveListings();
  const linked = linkedDirectories();
  const pending = submittedTo();
  if (!DIRECTORIES.length) return null;

  const marquee = live.length >= 2;
  const strip = [...live, ...live]; // duplicated for a seamless loop

  return (
    <section
      id="directories"
      aria-label="Directories"
      style={{ padding: "72px 0 8px", textAlign: "center", overflow: "hidden" }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px" }}>
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--g-gray-500)",
            margin: "0 0 24px",
          }}
        >
          {marquee ? "Listed on" : "Find Mantis Ai across the web"}
        </p>

        {marquee && (
          <div
            className="mantis-dir-marquee"
            style={{
              position: "relative",
              maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
            }}
          >
            <ul
              className="mantis-dir-track"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 48,
                listStyle: "none",
                margin: 0,
                padding: "4px 0",
                width: "max-content",
              }}
            >
              {strip.map((d, i) => (
                <li key={`${d.name}-${i}`} aria-hidden={i >= live.length}>
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener"
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "var(--g-gray-500)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Outbound links, and nothing implied beyond that. Several of these directories list
            products for free on the condition that the site links back to them. */}
        {(linked.length > 0 || pending.length > 0) && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--g-gray-500)",
              margin: marquee ? "26px 0 0" : "0",
              lineHeight: 1.8,
            }}
          >
            {linked.length > 0 && (
              <>
                Directories we link to:{" "}
                {linked.map((d, i) => (
                  <span key={d.name}>
                    <a
                      href={d.href}
                      target="_blank"
                      rel="noopener"
                      style={{ color: "var(--g-green-text)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {d.name}
                    </a>
                    {i < linked.length - 1 ? ", " : ""}
                  </span>
                ))}
                {pending.length > 0 ? " · " : ""}
              </>
            )}
            {pending.length > 0 && (
              <>
                Submitted to:{" "}
                {pending.map((d, i) => (
                  <span key={d.name}>
                    <a
                      href={d.href}
                      target="_blank"
                      rel="noopener"
                      style={{ color: "var(--g-gray-500)", textDecoration: "none" }}
                    >
                      {d.name}
                    </a>
                    {i < pending.length - 1 ? ", " : ""}
                  </span>
                ))}
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
