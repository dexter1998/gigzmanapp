"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { subscribeToasts, type ToastItem } from "./toast";
import "./toast.css";

const ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: AlertCircle };
const MAX = 4;

/** Renders every `toast()` call. Mounted once, in the root layout. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts((t) => setItems((xs) => [...xs, t].slice(-MAX))), []);
  const close = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));
  if (!items.length) return null;
  return (
    <div className="tst-stack" role="region" aria-label="Notifications">
      {items.map((t) => <Toast key={t.id} t={t} onClose={() => close(t.id)} />)}
    </div>
  );
}

function Toast({ t, onClose }: { t: ToastItem; onClose: () => void }) {
  const [left, setLeft] = useState(t.duration);
  const [hover, setHover] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  // Counts down once a second; hovering holds it so a toast being read never vanishes.
  useEffect(() => {
    if (hover) return;
    const iv = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(iv);
  }, [hover]);
  useEffect(() => { if (left <= 0) closeRef.current(); }, [left]);
  const Icon = ICON[t.tone];
  return (
    <div className={`tst tst-${t.tone}`} role={t.tone === "error" || t.tone === "warning" ? "alert" : "status"}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="tst-card">
        <span className="tst-icon"><Icon size={15} strokeWidth={2.2} /></span>
        <div className="tst-text">
          <b>{t.title}</b>
          {t.message && <p>{t.message}</p>}
        </div>
        {t.actions?.map((a) => (
          <button key={a.label} type="button" className="tst-act" onClick={() => { a.onClick(); onClose(); }}>{a.label}</button>
        ))}
        <button type="button" className="tst-x" onClick={onClose} aria-label="Dismiss"><X size={14} /></button>
      </div>
      <div className="tst-foot">{hover ? "Paused while you read" : <>This message will disappear in <b>{Math.max(left, 0)}sec</b></>}</div>
    </div>
  );
}
