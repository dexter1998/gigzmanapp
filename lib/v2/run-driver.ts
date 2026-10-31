import type { RunSnapshot } from "@/lib/v2/runner";

/**
 * Keeps a running search going while the user moves around the app (Leads, Settings…), and only
 * then. The tick loop used to live inside the chat page, so leaving the chat froze the run. It lives
 * here now: a module-level loop, which the App Router keeps alive across in-app navigation. Closing
 * or reloading the tab ends it — the run simply stays where it was (no server-side driver, by design)
 * and continues when its chat is opened again. The run's DB lock keeps two tabs from doubling work.
 */
type Listener = (run: RunSnapshot) => void;
const loops = new Map<string, { listeners: Set<Listener>; active: boolean }>();

export function driveRun(runId: string, onSnapshot: Listener): () => void {
  let entry = loops.get(runId);
  if (!entry) { entry = { listeners: new Set(), active: false }; loops.set(runId, entry); }
  entry.listeners.add(onSnapshot);
  if (!entry.active) void loop(runId, entry);
  const e = entry;
  return () => { e.listeners.delete(onSnapshot); };
}

async function loop(runId: string, entry: { listeners: Set<Listener>; active: boolean }) {
  entry.active = true;
  try {
    for (;;) {
      // Each tick works ~15s server-side, then answers with the new state.
      const data = (await (await fetch(`/api/v2/runs/${runId}/tick`, { method: "POST" })).json()) as { run?: RunSnapshot };
      const run = data.run;
      if (!run) break;
      for (const l of entry.listeners) l(run);
      if (run.status !== "running") break;
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch { /* offline or the tab is going away: the run waits in the database */ }
  finally { entry.active = false; }
}
