"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the server component tree on an interval so the funnel reads as live.
 *
 * router.refresh() rather than a polling fetch + local state: the counts are already computed in
 * the page's own queries, so refreshing the tree keeps one source of truth instead of a second
 * endpoint that can disagree with the page it sits on.
 *
 * Pauses while the tab is hidden. A background tab polling a production database every few
 * seconds for nobody to look at is pure cost, and an admin left open overnight is the normal case
 * rather than the exception.
 */
export function LiveRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [last, setLast] = useState<Date | null>(null);

  useEffect(() => {
    if (!on) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLast(new Date());
    };
    const id = setInterval(tick, seconds * 1000);
    return () => clearInterval(id);
  }, [on, seconds, router]);

  return (
    <div className="live-ctl">
      <button type="button" className={`live-toggle ${on ? "is-on" : ""}`} onClick={() => setOn((v) => !v)}>
        <span className="live-dot" aria-hidden />
        {on ? `Live · ${seconds}s` : "Paused"}
      </button>
      {last && <span className="live-last">updated {last.toLocaleTimeString("en-IN")}</span>}
    </div>
  );
}
