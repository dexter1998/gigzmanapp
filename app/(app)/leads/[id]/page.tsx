import { redirect } from "next/navigation";

/**
 * Deep link to a single lead, used by the "unlock this lead" button in lead emails.
 *
 * There is no single-lead view yet, so rather than 404 (which is what this URL did before, on a
 * link we were actively emailing people) it lands on the leads table with the id carried through
 * as ?lead=. That id is what a focused row or detail panel will key off once it exists; until then
 * the recipient at least arrives somewhere real and signed in.
 */
export default async function LeadDeepLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/leads?lead=${encodeURIComponent(id)}`);
}
