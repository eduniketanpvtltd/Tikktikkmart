"use client";

import { BlurHashPreview, readImagePreview, rememberImagePreview } from "@/components/ui/BlurHashPreview";
import { useEffect, useRef, useState } from "react";

export function CatalogImage({
  src,
  className = "object-contain",
  loading = "eager",
  blurHash,
}: {
  src?: string | null;
  className?: string;
  loading?: "lazy" | "eager";
  blurHash?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const [cached, setCached] = useState<{ src: string; hash: string }>();
  useEffect(() => {
    const img = imgRef.current;
    if (src && img?.complete && img.naturalWidth > 0) {
      setLoaded(src);
    }
  }, [src]);
  useEffect(() => {
    if (!src || blurHash) return;
    const hash = readImagePreview(src);
    if (hash) setCached({ src, hash });
  }, [src, blurHash]);
  const preview = blurHash ?? (cached?.src === src ? cached?.hash : undefined);
  const hasSource = Boolean(src && failed !== src);
  const ready = hasSource && loaded === src;

  return (
    <span className="media-frame catalog-image-frame">
      {!ready && preview && <BlurHashPreview hash={preview} />}
      {!ready && !preview && <span aria-hidden="true" className={`absolute inset-0 overflow-hidden rounded-[inherit] bg-[var(--theme-skeleton)] ${hasSource ? "catalog-image-loading" : ""}`} />}
      {hasSource && src && (
        <img
          ref={imgRef}
          key={src}
          src={src}
          alt=""
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            setLoaded(src);
            if (typeof requestIdleCallback === "function") {
              requestIdleCallback(() => rememberImagePreview(src, image));
            }
          }}
          onError={() => setFailed(src)}
          data-image-ready={ready ? "" : undefined}
          className={`catalog-fade-image block absolute inset-0 size-full ${ready ? "" : "opacity-0"} ${className}`}
        />
      )}
    </span>
  );
}
