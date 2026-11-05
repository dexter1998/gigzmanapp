"use client";

/**
 * Renders a V2 reply's `blocks` (lib/v2/blocks.ts) — the registry for structured responses.
 * Unknown block types render nothing, so an older client never breaks on a newer reply.
 */

import { useState } from "react";
import { SlidersHorizontal, Pencil, Store, MapPin, ScanSearch, CircleCheck, Contact, Check, Target, Map as MapIcon, Globe, Filter, Coins, ArrowDown, AlertTriangle, Play, Building2, Package, Users, ArrowLeftRight, Lightbulb } from "lucide-react";
import type { Block, ScopeBlock, ContextBlock } from "@/lib/v2/blocks";
import type { ChatAction } from "@/lib/v2/state";
import { Markdown } from "./Markdown";

type Send = (display: string, value?: string, action?: ChatAction) => void;

export function Blocks({ blocks, onSend, onViewRun, startedRunIds }: { blocks: Block[]; onSend: Send; onViewRun?: () => void; startedRunIds?: Set<string> }) {
  return (
    <div className="blk-stack">
      {blocks.map((b, i) => {
        if (b.type === "markdown") return <Markdown key={i} text={b.text} />;
        if (b.type === "context") return <ContextCard key={i} b={b} onSend={onSend} />;
        if (b.type === "scope") return <ScopeCard key={i} b={b} onSend={onSend} onViewRun={onViewRun} started={!!onViewRun || !!startedRunIds?.has(b.runId)} />;
        return null;
      })}
    </div>
  );
}

const STEP_ICON = [MapIcon, Globe, Filter];
/** The planner keeps at most three required signals. */
const MAX_SIGNALS = 3;

/** "Search scope": what Mantis understood, as a card the user can edit and re-run. */
function ScopeCard({ b, onSend, onViewRun, started }: { b: ScopeBlock; onSend: Send; onViewRun?: () => void; started: boolean }) {
  const [edit, setEdit] = useState(false);
  const [industry, setIndustry] = useState(b.industry);
  const [geo, setGeo] = useState(b.geography);
  const [target, setTarget] = useState(b.target);
  const [signals, setSignals] = useState(b.signals.map((s) => s.id));
  const [contacts, setContacts] = useState(b.contacts.length > 0);

  // Older cards carry no options: the plan's own signals are the only toggles then.
  const options = b.signalOptions?.length ? b.signalOptions : b.signals.map((s) => ({ ...s, label: s.label.replace(/ · \d+ of \d+$/, "") }));

  function rerun() {
    const sig = options.filter((s) => signals.includes(s.id)).map((s) => s.label.toLowerCase());
    const brief = `Find ${target} ${industry} in ${geo}${sig.length ? ` that have: ${sig.join(", ")}` : ""}${contacts ? ", with emails and company LinkedIn" : ", no contacts needed"}`;
    setEdit(false);
    onSend(`Edit scope: ${target} ${industry} in ${geo}${sig.length ? ` · ${sig.join(", ")}` : " · no signal filter"}`, undefined, { type: "plan", brief, signals });
  }

  return (
    <section className="blk-scope" aria-label="Search scope">
      <header className="blk-head"><SlidersHorizontal size={17} /> <h3>Search scope</h3>
        {!edit && <button type="button" className="blk-link" onClick={() => setEdit(true)}><Pencil size={13} /> Edit</button>}
      </header>

      <div className="blk-tiles">
        <div className="blk-tile"><Store size={18} /><span>Industry</span>
          {edit ? <input value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry" /> : <b>{b.industry}</b>}</div>
        <div className="blk-tile"><MapPin size={18} /><span>Geography</span>
          {edit ? <input value={geo} onChange={(e) => setGeo(e.target.value)} aria-label="Geography" /> : <b>{b.geography}</b>}</div>
      </div>

      {edit ? (
        // Editing: every offered signal is a toggle. What is picked here is exactly what the run
        // filters on — nothing is added back from the trade words (Tarun, 2026-11-02).
        <div className="blk-box blk-sigpick">
          <div className="blk-box-head"><ScanSearch size={16} /> <b>Signals</b>
            <span className={`blk-pill${signals.length ? " green" : ""}`}>{signals.length ? `${signals.length} of ${MAX_SIGNALS} picked` : "Any business"}</span></div>
          <div className="blk-sigpick-grid" role="group" aria-label="Signals to require">
            {options.map((s) => {
              const on = signals.includes(s.id);
              const full = !on && signals.length >= MAX_SIGNALS;
              return (
                <button type="button" key={s.id} aria-pressed={on} disabled={full} className={`blk-sigopt${on ? " on" : ""}`}
                  title={full ? `Up to ${MAX_SIGNALS} signals — remove one first` : s.detail}
                  onClick={() => setSignals(on ? signals.filter((x) => x !== s.id) : [...signals, s.id])}>
                  <span className="blk-sigopt-box" aria-hidden>{on && <Check size={12} strokeWidth={3} />}</span>
                  <span className="blk-sigopt-text"><b>{s.label}</b><em>{s.detail}</em></span>
                </button>
              );
            })}
          </div>
          <p className="blk-fine">{signals.length > 1 ? "Each signal is its own reason to qualify — results are split between them." : signals.length ? "Every result will have this signal." : "No signal: businesses of this type, ranked by fit."}</p>
        </div>
      ) : b.signals.length > 0 && (
        <div className="blk-box">
          <div className="blk-box-head"><ScanSearch size={16} /> <b>Website signals</b><span className="blk-pill">Filters</span></div>
          {b.signals.map((s) => (
            <div key={s.id} className="blk-sig">
              <CircleCheck size={17} className="blk-sig-icon" />
              <span><b>{s.label}</b><em>{s.detail}</em></span>
              <span className="blk-pill green">Required</span>
            </div>
          ))}
          <p className="blk-fine" title="Absence is only marked when the website could be read; pages that didn't load stay unverified.">Unreadable sites stay unverified</p>
        </div>
      )}

      {(b.contacts.length > 0 || edit) && (
        <div className="blk-box">
          <div className="blk-box-head"><Contact size={16} /> <b>Contact data</b>
            {edit && <label className="blk-toggle"><input type="checkbox" checked={contacts} onChange={(e) => setContacts(e.target.checked)} /> Read contacts</label>}</div>
          {(contacts ? ["Public business email", "Company LinkedIn URL"] : []).map((c) => (
            <div key={c} className="blk-contact"><Check size={15} /> <span>{c}</span><span className="blk-pill">If available</span></div>
          ))}
        </div>
      )}

      <div className="blk-box">
        <div className="blk-target"><Target size={22} />
          <span><em>Target results</em>{edit
            ? <input type="number" min={5} max={500} value={target} onChange={(e) => setTarget(Math.max(5, Math.min(500, Number(e.target.value) || 20)))} aria-label="Target" />
            : <b>{b.target} businesses</b>}</span>
          <span className="blk-pill">Estimate</span></div>
        <ol className="blk-steps">
          {b.steps.map((s, i) => { const I = STEP_ICON[i] ?? Filter; return <li key={i}><I size={16} /><span><b>{i + 1}. {s.title}</b><em>{s.detail}</em></span></li>; })}
        </ol>
        <p className="blk-fine" title="The target is not a guarantee. Extra sources are tried only when the first ones run short.">Not guaranteed · extra sources if short</p>
      </div>

      {b.reasoning && (
        <div className="blk-box blk-why"><div className="blk-box-head"><Lightbulb size={16} /> <b>Why this approach</b>{b.reusedPipeline && <span className="blk-pill green">Reusing a proven pipeline</span>}</div>
          <p className="blk-ctx-sum">{b.reasoning}</p></div>
      )}

      <div className="blk-box blk-usage"><Coins size={17} /><span><b>Estimated usage</b><em>{b.usage.note}</em></span></div>

      {b.cannotDo && <div className="blk-warn"><AlertTriangle size={15} /> Not yet: {b.cannotDo}</div>}

      <div className="blk-actions">
        {edit ? (
          <>
            <button type="button" className="v2-btn" onClick={() => setEdit(false)}>Cancel</button>
            {/* An edited scope is a new plan with its own quote — it comes back to be confirmed. */}
            <button type="button" className="v2-btn primary" data-track="chat.scope.update" onClick={rerun}>Update scope</button>
          </>
        ) : (
          <>
            <button type="button" className="v2-btn" data-track="chat.scope.edit" onClick={() => setEdit(true)}><Pencil size={14} /> Edit scope</button>
            {onViewRun && <button type="button" className="v2-btn primary" onClick={onViewRun}>Follow the run <ArrowDown size={14} /></button>}
            {!started && <button type="button" className="v2-btn primary" data-track="chat.plan.run_click" onClick={() => onSend("Run this", undefined, { type: "run_plan", runId: b.runId })}><Play size={14} /> Run this</button>}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * "Client context": who these leads are for — business, the one offering they are for, its buyers.
 * Confirmed here before any scope is planned (the pitch-deck order: context → ICP → strategy →
 * pipeline). Edits are made in the chat, which updates the profile and shows this card again.
 */
function ContextCard({ b, onSend }: { b: ContextBlock; onSend: Send }) {
  const many = b.offerings.length > 1;
  const [offering, setOffering] = useState<string | null>(b.offering);
  const [done, setDone] = useState(false);
  const host = b.website ? b.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "") : null;
  const consumer = b.sellsTo === "consumers";

  function confirm() {
    setDone(true);
    onSend(`Use ${b.name}${offering ? ` · ${offering}` : ""}`, undefined, { type: "confirm_context", profileId: b.profileId, offering, brief: b.brief });
  }
  function edit() {
    window.dispatchEvent(new CustomEvent("mantis:compose", { detail: `Change ${b.name}'s profile: ` }));
  }

  return (
    <section className="blk-scope blk-ctx" aria-label="Client context">
      <header className="blk-head"><Building2 size={17} /> <h3>Client context</h3>
        <span className={`blk-pill${b.fresh ? " green" : ""}`}>{b.fresh ? "Just read" : "Saved profile"}</span></header>

      <div className="blk-tiles">
        <div className="blk-tile"><Building2 size={18} /><span>Business</span><b>{b.name}</b>{host && <a className="blk-ctx-site" href={b.website!} target="_blank" rel="noopener noreferrer">{host}</a>}</div>
        <div className="blk-tile"><MapPin size={18} /><span>Serves</span><b>{b.areas.length ? b.areas.join(", ") : "Not stated"}</b>
          {b.sellsTo && <em className="blk-ctx-model">{b.sellsTo === "businesses" ? "Sells to businesses (B2B)" : b.sellsTo === "consumers" ? "Sells to consumers (B2C)" : "Sells to businesses and consumers"}</em>}</div>
      </div>

      {b.summary && <p className="blk-ctx-sum">{b.summary}</p>}

      <div className="blk-box">
        <div className="blk-box-head"><Package size={16} /> <b>{many ? "Which offering are these leads for?" : "Offering"}</b>{many && <span className="blk-pill">Pick one</span>}</div>
        {b.offerings.length ? (
          <div className="blk-ctx-chips" role={many ? "radiogroup" : undefined}>
            {b.offerings.map((o) => (
              <button key={o} type="button" disabled={done || !many} role={many ? "radio" : undefined} aria-checked={many ? offering === o : undefined}
                className={`blk-ctx-chip${offering === o || !many ? " on" : ""}`} onClick={() => setOffering(o)}>
                {(offering === o || !many) && <Check size={13} />} {o}
              </button>
            ))}
            {many && <button type="button" disabled={done} role="radio" aria-checked={offering === ""}
              className={`blk-ctx-chip ghost${offering === "" ? " on" : ""}`} onClick={() => setOffering("")}>All offerings</button>}
          </div>
        ) : <p className="blk-fine">No offerings saved yet — tell me what it sells and I&apos;ll add them.</p>}
      </div>

      <div className="blk-box">
        <div className="blk-box-head"><Users size={16} /> <b>Ideal customers (ICP)</b><span className="blk-pill">Who buys it</span></div>
        {b.buyers.length
          ? <div className="blk-ctx-chips">{b.buyers.map((x) => <span key={x} className="blk-ctx-chip static">{x}</span>)}</div>
          : <p className="blk-fine">Not worked out yet — I&apos;ll infer buyers from the offering when planning.</p>}
        {consumer && <div className="blk-warn"><AlertTriangle size={15} /> This business sells to consumers. Mantis finds businesses — partners and vendors, not individual customers.</div>}
      </div>

      <div className="blk-actions">
        {!done ? (
          <>
            <button type="button" className="v2-btn" data-track="chat.context.edit" onClick={edit}><Pencil size={14} /> Edit in chat</button>
            {b.others.length > 0 && b.others.slice(0, 2).map((o) => (
              <button key={o.profileId} type="button" className="v2-btn blk-ctx-switch" title={`Use ${o.name} instead`} onClick={() => { setDone(true); onSend(`Use ${o.name} instead`, undefined, { type: "use_profile", profileId: o.profileId, brief: b.brief }); }}>
                <ArrowLeftRight size={14} /> <span className="blk-ctx-switch-name">{o.name}</span></button>
            ))}
            <button type="button" className="v2-btn primary" disabled={many && offering === null} title={many && offering === null ? "Pick an offering first" : undefined} data-track="chat.context.confirm_click" onClick={confirm}>
              <Check size={14} /> Use this and plan</button>
          </>
        ) : <span className="blk-pill green"><Check size={12} /> Confirmed</span>}
      </div>
    </section>
  );
}
