/** Metadata-only layout: the page itself is a client component and cannot export `metadata`.
 *  Email verification step. */
export const metadata = { title: "Verify Your Email" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
