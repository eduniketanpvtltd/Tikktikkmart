"use client";

import { useState, type ReactNode } from "react";

interface AccountAvatarProps {
  src?: string | null;
  className: string;
  fallback: ReactNode;
}

export function AccountAvatar({ src, className, fallback }: AccountAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();

  if (!src || src === failedSrc) return fallback;

  return (
    <span className={`media-frame inline-block shrink-0 ${className}`}>
      {/* Keep Google's avatar request free of a storefront referrer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="media-content" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />
    </span>
  );
}
