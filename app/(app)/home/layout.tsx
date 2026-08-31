/** Metadata-only layout: the page itself is a client component and cannot export `metadata`.
 *  The map workspace — the product's main surface. */
export const metadata = { title: "Find Leads" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
