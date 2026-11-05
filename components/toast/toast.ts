/**
 * App-wide toasts: `toast.success("Saved")`, `toast.error("Couldn't save", "Try again.")`. Callable
 * from any client code — no provider to thread through; <Toaster /> in the root layout renders them.
 */

export type ToastTone = "success" | "info" | "warning" | "error";
export type ToastAction = { label: string; onClick: () => void };
export type ToastInput = { tone?: ToastTone; title: string; message?: string; actions?: ToastAction[]; duration?: number };
export type ToastItem = Required<Pick<ToastInput, "tone" | "title">> & Omit<ToastInput, "tone" | "title"> & { id: number; duration: number };

// Long enough to read a sentence; problems stay longer than confirmations.
const DURATION: Record<ToastTone, number> = { success: 6, info: 8, warning: 12, error: 12 };

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function subscribeToasts(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; }

function show(t: ToastInput): number {
  const tone = t.tone ?? "info";
  const item: ToastItem = { ...t, tone, id: ++seq, duration: t.duration ?? DURATION[tone] };
  listeners.forEach((fn) => fn(item));
  return item.id;
}

type Opts = Omit<ToastInput, "tone" | "title" | "message">;
export const toast = Object.assign(show, {
  success: (title: string, message?: string, o?: Opts) => show({ tone: "success", title, message, ...o }),
  info: (title: string, message?: string, o?: Opts) => show({ tone: "info", title, message, ...o }),
  warning: (title: string, message?: string, o?: Opts) => show({ tone: "warning", title, message, ...o }),
  error: (title: string, message?: string, o?: Opts) => show({ tone: "error", title, message, ...o }),
});
