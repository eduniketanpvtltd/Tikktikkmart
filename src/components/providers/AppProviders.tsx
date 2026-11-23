"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, logout } from "@/lib/firebase/client";
import { CommandMenu } from "@/components/ui/CommandMenu";
import { withRequestKey } from "@/lib/api/idempotency";
import { UndoToasts } from "@/components/ui/UndoToast";
import type { UserRole } from "@/types/db";

export interface SessionUser {
  id: string;
  firebase_uid: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  role: UserRole;
  is_blocked: boolean;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: SessionUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 15 * 60_000,
      refetchOnMount: "always",
      retry: (count, error) => count < 2 && !/HTTP 4\d\d/.test(error.message),
      networkMode: "offlineFirst",
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const account = useRef<string | null>(null);
  const generation = useRef(0);

  const syncSession = useCallback(async (fbUser: FirebaseUser | null) => {
    const request = ++generation.current;
    if (!fbUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: withRequestKey(new Headers({ Authorization: `Bearer ${token}` }), "POST"),
      });
      const json = await res.json();
      if (request !== generation.current) return;
      if (json?.ok && json.data) {
        const googlePhoto = fbUser.providerData.find(
          (provider) => provider.providerId === "google.com"
        )?.photoURL;
        setUser({
          ...json.data,
          photo_url: googlePhoto || fbUser.photoURL || json.data.photo_url,
        });
      } else if (res.status === 401 || res.status === 403) {
        setUser(null);
      }
    } catch {
      // Retain an already verified session through a temporary network failure.
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      const uid = fbUser?.uid ?? null;
      if (account.current !== uid) {
        if (account.current) queryClient.clear();
        account.current = uid;
        setUser(null);
      }
      setFirebaseUser(fbUser);
      syncSession(fbUser);
    });
    return () => unsub();
  }, [syncSession]);

  const refreshUser = useCallback(async () => {
    await syncSession(auth.currentUser);
  }, [syncSession]);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ firebaseUser, user, loading, refreshUser, signOut }}>
        {children}
        <CommandMenu role={user?.role} />
        <UndoToasts />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

