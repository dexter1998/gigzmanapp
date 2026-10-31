import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PageHeader, Section, Table, Pill, fmtDT, fmtN } from "../../../ui";

/**
 * One chat, end to end: what the user typed, what the agent did on each turn (its steps), the
 * cards it showed (Client context, Search scope + the orchestrator's reasoning), and every run the
 * chat started with its steps and mid-run decisions. Real user text — admin only, never exported.
 */
export const dynamic = "force-dynamic";
type Row = Record<string, unknown>;

export default async function ChatDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [[chat], msgs, runs] = await Promise.all([
    sql`SELECT id, title, user_email, created_at FROM chats WHERE id = ${id}`,
    sql`SELECT role, content, intent, feedback, created_at FROM chat_messages WHERE chat_id = ${id} ORDER BY created_at`,
    sql`SELECT id, status, target, delivered, plan, reasoning, created_at, finished_at FROM v2_runs WHERE chat_id = ${id} ORDER BY created_at`,
  ]);
  if (!chat) notFound();
  const runIds = (runs as Row[]).map((r) => String(r.id));
  const [steps, decisions, kept] = runIds.length ? await Promise.all([
    sql`SELECT run_id, seq, op, status, raw_count, kept_count, input->>'strategy' strat, detail FROM v2_run_steps WHERE run_id = ANY(${runIds}) ORDER BY run_id, seq`,
    sql`SELECT run_id, at, decision->>'action' action, decision->>'strategy' strategy, decision->>'reasoning' reasoning, created_at FROM v2_decisions WHERE run_id = ANY(${runIds}) ORDER BY id`,
    sql`SELECT run_id, category, count(*)::int n, count(*) FILTER (WHERE phone IS NOT NULL)::int ph, count(*) FILTER (WHERE jsonb_array_length(emails) > 0)::int em
        FROM v2_results WHERE run_id = ANY(${runIds}) AND rank IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 3 DESC`,
  ]) : [[], [], []];

  return (
    <>
      <PageHeader pretitle="Analysis · Chat" title={String(chat.title ?? "Untitled chat")}
        sub={`${chat.user_email} · started ${fmtDT(chat.created_at as Date)} · ${fmtN((msgs as Row[]).filter((m) => m.role === "user").length)} user turns`}
        actions={<Link className="underline text-[12px]" href={`/admin/users/${encodeURIComponent(String(chat.user_email))}`}>User profile →</Link>} />

      <Section title="Transcript" note="Each assistant turn shows the router's type, the action, and the steps the agent ran.">
        <div className="flex flex-col gap-3">
          {(msgs as Row[]).map((m, i) => {
            const it = (m.intent ?? {}) as Record<string, unknown>;
            const blocks = (Array.isArray(it.blocks) ? it.blocks : []) as Array<Record<string, unknown>>;
            const ctx = blocks.find((b) => b.type === "context");
            const scope = blocks.find((b) => b.type === "scope");
            const stepsTxt = (Array.isArray(it.steps) ? it.steps : []) as Array<{ label: string; detail?: string; ms?: number }>;
            return (
              <div key={i} className={`rounded-[var(--radius-md)] border border-[var(--rule)] p-3 ${m.role === "user" ? "bg-[var(--sunk,transparent)]" : ""}`}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--ink-muted)]">
                  <Pill tone={m.role === "user" ? "info" : "mut"}>{String(m.role)}</Pill>
                  <span>{fmtDT(m.created_at as Date)}</span>
                  {m.role === "assistant" && it.turnType ? <span>· {String(it.turnType)} / {String(it.action ?? "")}</span> : null}
                  {m.feedback ? <Pill tone={/down|-1|neg/.test(String(m.feedback)) ? "bad" : "ok"}>feedback {String(m.feedback)}</Pill> : null}
                </div>
                <div className="whitespace-pre-wrap text-[13px] text-[var(--ink)]">{String(m.content ?? "")}</div>
                {stepsTxt.length > 0 && <div className="mt-2 text-[11.5px] text-[var(--ink-muted)]">Steps: {stepsTxt.map((s) => `${s.label}${s.detail ? ` [${s.detail}]` : ""}${s.ms ? ` ${Math.round(s.ms / 100) / 10}s` : ""}`).join(" → ")}</div>}
                {ctx && <div className="mt-2 text-[12px]"><b>Client context card:</b> {String(ctx.name)} · offerings: {((ctx.offerings as string[]) ?? []).join(", ") || "—"} · buyers: {((ctx.buyers as string[]) ?? []).join(", ") || "—"}</div>}
                {scope && <div className="mt-2 text-[12px]"><b>Search scope:</b> {String(scope.industry)} @ {String(scope.geography)} · target {String(scope.target)} · signals: {((scope.signals as Array<{ label: string }>) ?? []).map((s) => s.label).join(", ") || "none"}{scope.reusedPipeline ? " · reused a proven pipeline" : ""}
                  {scope.reasoning ? <div className="mt-1 text-[var(--ink-muted)]"><b>Why:</b> {String(scope.reasoning)}</div> : null}
                  {scope.cannotDo ? <div className="mt-1 text-[var(--ink-muted)]"><b>Not yet:</b> {String(scope.cannotDo)}</div> : null}</div>}
              </div>
            );
          })}
        </div>
      </Section>

      {(runs as Row[]).map((r) => {
        const p = (r.plan ?? {}) as Record<string, unknown>;
        const myKept = (kept as Row[]).filter((k) => k.run_id === r.id);
        return (
          <div key={String(r.id)} className="mt-4">
            <Table title={`Run ${String(r.id).slice(0, 8)} · ${String(p.title ?? "")} · ${String(r.status)} ${fmtN(Number(r.delivered))}/${fmtN(Number(r.target))}`}
              note={`Delivered by category: ${myKept.map((k) => `${k.category} ${k.n} (${k.ph} phone, ${k.em} email)`).join(" · ") || "none"}`}
              head={["#", "Step", "Status", { label: "Kept / raw", num: true }, "Detail"]} empty="No steps."
              rows={(steps as Row[]).filter((s) => s.run_id === r.id).map((s) => [String(s.seq), `${s.op}${s.strat ? ` (${s.strat})` : ""}`, String(s.status), `${s.kept_count ?? "—"}/${s.raw_count ?? "—"}`, String(s.detail ?? "")])} />
            {(decisions as Row[]).filter((d) => d.run_id === r.id).length > 0 && (
              <Table title="Orchestrator decisions" head={["At", "Decision", "Reasoning"]} empty="—"
                rows={(decisions as Row[]).filter((d) => d.run_id === r.id).map((d) => [String(d.at), d.at === "plan" ? "approach" : `${d.action}${d.strategy ? ` → ${d.strategy}` : ""}`, String(d.reasoning ?? "")])} />
            )}
          </div>
        );
      })}
    </>
  );
}
