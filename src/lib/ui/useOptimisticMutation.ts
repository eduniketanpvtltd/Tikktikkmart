"use client";
import { useRef, useState } from "react";
import { enqueueUndo } from "@/components/ui/UndoToast";

export function useOptimisticMutation() {
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  return {
    pending,
    async run(key: string, apply: () => (() => void) | Promise<() => void>, request: () => Promise<{ ok: boolean; error?: string }>) {
      if (inFlight.current.has(key)) return false;
      inFlight.current.add(key);
      setPending(new Set(inFlight.current));
      let rollback: (() => void) | undefined;
      try {
        rollback = await apply();
        const response = await request();
        if (!response.ok) throw new Error(response.error ?? "Unable to save this change.");
        return true;
      } catch (error) {
        rollback?.();
        enqueueUndo(error instanceof Error ? error.message : "Unable to save this change.", undefined, undefined, 5000);
        return false;
      } finally {
        inFlight.current.delete(key);
        setPending(new Set(inFlight.current));
      }
    },
  };
}
