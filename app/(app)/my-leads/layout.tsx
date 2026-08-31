/** Metadata-only layout: the page itself is a client component and cannot export `metadata`.
 *  Saved and unlocked leads. */
export const metadata = { title: "My Leads" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
