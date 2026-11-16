"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, logout } from "@/lib/firebase/client";
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
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.ok && json.data) {
        setUser(json.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
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
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

