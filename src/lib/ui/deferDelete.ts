import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { auth } from "@/lib/firebase/client";
import { enqueueUndo } from "@/components/ui/UndoToast";

export function deferDelete<T>(client: QueryClient, queryKey: QueryKey, key: string, url: string, label: string, remove: (current: T) => T) {
  const uid = auth.currentUser?.uid;
  enqueueUndo(`${label} removed`, () => {}, async () => {
    if (auth.currentUser?.uid !== uid) throw new Error("Sign in again to remove this item.");
    const result = await apiFetch(url, { method: "DELETE" });
    if (!result.ok) throw new Error(result.error ?? "Unable to remove this item.");
    client.setQueryData<T>(queryKey, (current) => current == null ? current : remove(current));
    void client.invalidateQueries({ queryKey });
  }, 6500, key);
}
