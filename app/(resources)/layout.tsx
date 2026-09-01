import "./resources/resources.css";

/** The Resource Center shares the marketing chrome. One header and footer across every route was
 *  the fix the gigzman audit called Critical — a section that looks like a different company
 *  breaks trust before the content is read. */
export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <div className="rc">{children}</div>;
}
