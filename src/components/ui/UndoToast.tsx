"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type UndoEntry = { id: number; key?: string; message: string; until: number; duration: number; undo?: () => void; timer: number; committing?: boolean };
let nextId = 0;
const empty: UndoEntry[] = [];
let entries = empty;
const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
const snapshot = () => entries;
const serverSnapshot = () => empty;
function publish(next: UndoEntry[]) { entries = next; listeners.forEach((listener) => listener()); }
function remove(id: number) { publish(entries.filter((entry) => entry.id !== id)); }

export function enqueueUndo(message: string, undo?: () => void, commit?: () => void | Promise<void>, duration = 6500, key?: string) {
  if (key && entries.some((entry) => entry.key === key)) return;
  const id = ++nextId;
  const timer = window.setTimeout(() => {
    if (!commit) { remove(id); return; }
    publish(entries.map((entry) => entry.id === id ? { ...entry, committing: true } : entry));
    void Promise.resolve().then(() => commit?.()).catch((error) => {
      enqueueUndo(error instanceof Error ? error.message : "The change couldn’t be saved.", undefined, undefined, 5000);
    }).finally(() => remove(id));
  }, duration);
  publish([...entries, { id, key, message, until: Date.now() + duration, duration, undo, timer }]);
}

export function useUndoKeys() {
  const pending = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return new Set(pending.map(({ key }) => key).filter(Boolean));
}

export function UndoToasts() {
  const toasts = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!toasts.length) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [toasts.length]);

  if (!toasts.length) return null;
  return (
    <div className="undo-stack" aria-label="Recent changes">
      {toasts.filter((toast) => !toast.committing).map((toast) => {
        const remaining = Math.max(0, Math.min(1, (toast.until - now) / toast.duration));
        return (
          <div key={toast.id} className="undo-toast">
            <span role="status">{toast.message}</span>
            {toast.undo && <button type="button" onClick={() => {
              if (!entries.includes(toast)) return;
              window.clearTimeout(toast.timer);
              remove(toast.id);
              toast.undo?.();
            }}>Undo <span aria-hidden="true">{Math.ceil(remaining * toast.duration / 1000)}s</span></button>}
            <span className="undo-progress" aria-hidden="true" style={{ transform: `scaleX(${remaining})` }} />
          </div>
        );
      })}
    </div>
  );
}
