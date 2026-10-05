/**
 * One line, with the rest on hover.
 *
 * Free-text columns — a partner's "in their words", a contact message — were allowed to wrap, and
 * one 300-character answer then set the height of its whole row. A table whose rows are different
 * heights is a table you cannot scan, which is the only thing these tables are for.
 *
 * The full text is in a hover panel rather than just `title`: the native tooltip takes about a
 * second to appear, renders in the OS font, and never shows on touch. `title` is kept anyway as the
 * fallback for keyboard and screen-reader users, who do not get a CSS :hover.
 *
 * Server component — no state, nothing to hydrate.
 */
export function Clamp({ text, width = 240 }: { text: string | null | undefined; width?: number }) {
  const value = (text ?? "").trim();
  if (!value) return <span className="text-[var(--ink-faint)]">—</span>;

  return (
    <span className="adm-clamp" style={{ maxWidth: width }}>
      <span className="adm-clamp-line" title={value}>{value}</span>
      <span className="adm-clamp-full" role="tooltip">{value}</span>
    </span>
  );
}
