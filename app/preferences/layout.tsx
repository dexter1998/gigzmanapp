/** Metadata-only layout: the page itself is a client component and cannot export `metadata`.
 *  Subscription preferences, reachable from an email link. */
export const metadata = { title: "Email Preferences" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
