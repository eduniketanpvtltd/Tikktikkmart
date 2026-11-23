"use client";

import { useEffect, useRef } from "react";

export function CodeInput({ value, onChange, length = 4, label, sms = false }: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label: string;
  sms?: boolean;
}) {
  const fields = useRef<Array<HTMLInputElement | null>>([]);
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!sms || !("OTPCredential" in window) || !window.isSecureContext) return;
    const controller = new AbortController();
    const options = { otp: { transport: ["sms"] }, signal: controller.signal } as CredentialRequestOptions;
    void navigator.credentials.get(options).then((credential) => {
      const code = (credential as (Credential & { code: string }) | null)?.code;
      if (code) callback.current(code.replace(/\D/g, "").slice(0, length));
    }).catch(() => {});
    return () => controller.abort();
  }, [length, sms]);

  function enter(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (raw && !digits) return;
    if (digits.length >= length) {
      onChange(digits.slice(0, length));
      fields.current[length - 1]?.focus();
      return;
    }
    const start = Math.min(index, value.length);
    onChange((value.slice(0, start) + digits + value.slice(start + Math.max(1, digits.length))).slice(0, length));
    if (digits) fields.current[Math.min(start + digits.length, length - 1)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="verification-code">
      {Array.from({ length }, (_, index) => (
        <input key={index} ref={(node) => { fields.current[index] = node; }}
          inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`} value={value[index] ?? ""}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => enter(index, event.target.value)}
          onPaste={(event) => { event.preventDefault(); enter(index, event.clipboardData.getData("text")); }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value[index] && index > 0) {
              event.preventDefault();
              enter(index - 1, "");
              fields.current[index - 1]?.focus();
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              fields.current[index + (event.key === "ArrowLeft" ? -1 : 1)]?.focus();
            }
          }} />
      ))}
    </div>
  );
}
