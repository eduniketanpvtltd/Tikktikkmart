"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      const token = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.ok) {
        window.location.href = "/";
      } else {
        setError(json?.error || "Login verification failed");
        setLoading(false);
      }
    } catch (e: any) {
      setError(e?.message || "Google Sign-In failed or cancelled");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f66002] via-[#f66002]/20 to-[#f4f6fb] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-800 text-xs font-bold shadow-2xs transition-colors backdrop-blur-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" /> Back to store
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-6 shadow-[0_16px_40px_rgba(246,96,2,0.12)] my-auto">
        {/* Brand Header with Logo */}
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center justify-center select-none mb-1">
            <img
              src="/logo.png"
              alt="TIKK TIKK MART"
              width={80}
              height={80}
              style={{ width: "80px", height: "80px" }}
              className="w-20 h-20 rounded-2xl shadow-md object-contain mb-2 hover:scale-105 transition-transform"
            />
            <h1 className="font-black text-2xl tracking-tighter text-[#13193b]">
              TIKK TIKK <span className="text-[#f66002]">MART</span>
            </h1>
            <p className="text-[11px] font-black text-[#f66002] tracking-wider uppercase">
              — Last Minute Saver —
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[#f66002] font-black text-xs uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-[#f66002]" />
            <span>10-Minute Express Grocery Delivery</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Feature Pills */}
        <div className="bg-[#fffaf5] rounded-2xl p-3.5 space-y-2.5 border border-orange-100/80">
          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-800">
            <span className="text-sm">⚡</span>
            <span>Over 5,000+ groceries delivered in 10 minutes</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-800">
            <span className="text-sm">🏷️</span>
            <span>Flat ₹50 OFF on first order with code <b className="text-[#f66002]">WELCOME50</b></span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-800">
            <span className="text-sm">🛵</span>
            <span>Real-time GPS delivery tracking & OTP verification</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full py-3.5 rounded-2xl bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50/80 active:scale-[0.99] text-gray-800 font-black text-xs sm:text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-[#f66002] border-t-transparent animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              {/* Google G logo */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          By signing in, you agree to our Terms of Service, Privacy Policy and Content Policies.
        </p>
      </div>

      <div className="max-w-md w-full mx-auto text-center text-xs text-gray-600 py-4 flex items-center justify-center gap-1.5 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#f66002]" />
        <span>100% Secure Authentication via Google OAuth</span>
      </div>
    </main>
  );
}
