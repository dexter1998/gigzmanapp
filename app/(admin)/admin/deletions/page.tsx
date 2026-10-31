import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { accountStats, approveDeletion, rejectRequest, type DeletionRequest } from "@/lib/account-deletion";
import { sendAccountDeleted } from "@/lib/email/account-deletion";
import { PageHeader, Table, Pill, fmtDT, fmtN } from "../ui";
import { DecisionForms } from "./DecisionForms";

/**
 * Account deletion requests. Users file them from /profile; nothing is deleted until someone
 * approves here. Approve runs lib/account-deletion.ts approveDeletion() — one transaction that
 * rolls back on any error, with the full table list documented there.
 *
 * Like /admin/grants this page writes, as a deliberate exception to the console's read-only rule.
 */
export const dynamic = "force-dynamic";

const TONE: Record<DeletionRequest["status"], "warn" | "bad" | "mut" | "info"> = {
  pending: "warn", approved: "bad", rejected: "info", cancelled: "mut",
};

export default async function DeletionsPage({ searchParams }: { searchParams: Promise<{ error?: string; done?: string }> }) {
  const adminEmail = await requireAdmin();
  const sp = await searchParams;

  const requests = await sql<DeletionRequest[]>`
    SELECT * FROM account_deletion_requests
     ORDER BY (status = 'pending') DESC, requested_at DESC
     LIMIT 200
  `;
  const stats = new Map(
    await Promise.all(
      requests.filter((r) => r.status === "pending").map(async (r) => [r.id, await accountStats(r.user_email)] as const),
    ),
  );

  async function approve(formData: FormData) {
    "use server";
    const by = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    let target: string;
    try {
      const summary = await approveDeletion(id, by);
      target = summary.email;
    } catch (err) {
      redirect(`/admin/deletions?error=${encodeURIComponent((err as Error).message.slice(0, 300))}`);
    }
    void sendAccountDeleted(target);
    revalidatePath("/admin/deletions");
    redirect(`/admin/deletions?done=${encodeURIComponent(target)}`);
  }

  async function reject(formData: FormData) {
    "use server";
    const by = await requireAdmin();
    await rejectRequest(String(formData.get("id") ?? ""), by, String(formData.get("note") ?? ""));
    revalidatePath("/admin/deletions");
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="mantis-admin min-h-screen">
      <div className="mx-auto w-full max-w-[1400px] p-5">
        <PageHeader
          pretitle="Accounts"
          title="Deletion requests"
          sub={`${pendingCount} pending · approving deletes the account in one transaction · signed in as ${adminEmail}`}
        />

        {sp.error && (
          <div className="mb-3 rounded-[var(--radius-md)] border px-4 py-2.5 text-[12px]"
               style={{ borderColor: "color-mix(in oklab, var(--critical) 45%, transparent)", color: "var(--critical)" }}>
            Deletion failed and was rolled back — nothing changed. {sp.error}
          </div>
        )}
        {sp.done && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--rule)] px-4 py-2.5 text-[12px] text-[var(--ink-muted)]">
            Deleted {sp.done}. Payments and credit ledger kept, anonymised.
          </div>
        )}

        <Table
          title="Requests"
          note="Pending first. Stats are live for pending requests; decided ones keep the deletion summary in the note."
          head={["Account", "Status", "Requested", "Reason", { label: "Credits", num: true }, { label: "Leads", num: true }, { label: "Campaigns", num: true }, { label: "Chats", num: true }, "Decision", ""]}
          rows={requests.map((r) => {
            const s = stats.get(r.id);
            return [
              <span key="e" className="text-[var(--ink)]">{r.user_email}{s && !s.exists ? <span className="ml-1.5 text-[10.5px] text-[var(--ink-faint)]">no profile</span> : null}</span>,
              <Pill key="s" tone={TONE[r.status]}>{r.status}</Pill>,
              <span key="r" className="text-[var(--ink-faint)]">{fmtDT(r.requested_at)}</span>,
              <span key="why" className="block max-w-[280px] whitespace-normal text-[var(--ink-muted)]">{r.reason || <span className="text-[var(--ink-faint)]">—</span>}</span>,
              s ? fmtN(s.credits) : "—",
              s ? fmtN(s.leads) : "—",
              s ? fmtN(s.campaigns) : "—",
              s ? fmtN(s.chats) : "—",
              r.decided_at
                ? <span key="d" className="block max-w-[260px] whitespace-normal text-[10.5px] text-[var(--ink-faint)]">{fmtDT(r.decided_at)} · {r.decided_by}{r.note ? ` · ${r.note}` : ""}</span>
                : <span key="d" className="text-[var(--ink-faint)]">—</span>,
              r.status === "pending"
                ? <DecisionForms key="x" id={r.id} email={r.user_email} approve={approve} reject={reject} />
                : <span key="x" className="text-[10.5px] text-[var(--ink-faint)]">—</span>,
            ];
          })}
          empty="No deletion requests yet."
        />
      </div>
    </div>
  );
}
