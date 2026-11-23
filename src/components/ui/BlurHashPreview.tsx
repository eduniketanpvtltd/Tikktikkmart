"use client";

import { decode, encode } from "blurhash";
import { useEffect, useRef } from "react";

const storageKey = "ttm-image-previews";
const sizes = 16;
const decoded = new Map<string, Uint8ClampedArray>();
type PreviewCache = Record<string, string>;
const builtIn: PreviewCache = {
  "/storefront/eggs.webp": "L8JFe+=wW;^N};-mxFt6E*NIxZIp",
  "/storefront/tomatoes.webp": "LXM2b|NuxFsn}D$NoKbHxDbGsnj[",
  "/storefront/market.webp": "L68;V.x]4ms8D$ob~Xa$xsxa-=R*",
};
let memory: PreviewCache | undefined;

function cache(): PreviewCache {
  if (!memory) {
    try { memory = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {}; }
    catch { memory = {}; }
  }
  return memory ?? {};
}

export function readImagePreview(src: string) {
  return cache()[src] ?? builtIn[src];
}

export function rememberImagePreview(src: string, image: HTMLImageElement) {
  if (!src || new URL(src, location.href).origin !== location.origin || !image.naturalWidth) return;
  const previews = cache();
  if (previews[src] || builtIn[src]) return;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = sizes;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, sizes, sizes);
    previews[src] = encode(ctx.getImageData(0, 0, sizes, sizes).data, sizes, sizes, 4, 3);
    memory = Object.fromEntries(Object.entries(previews).slice(-72));
    localStorage.setItem(storageKey, JSON.stringify(memory));
  } catch {}
}

export function BlurHashPreview({ hash }: { hash: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    try {
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) return;
      const pixels = ctx.createImageData(sizes, sizes);
      let data = decoded.get(hash);
      if (!data) {
        data = decode(hash, sizes, sizes);
        if (decoded.size >= 80) decoded.delete(decoded.keys().next().value!);
        decoded.set(hash, data);
      }
      pixels.data.set(data);
      ctx.putImageData(pixels, 0, 0);
    } catch {}
  }, [hash]);
  return <canvas aria-hidden="true" ref={canvas} width={sizes} height={sizes} className="pointer-events-none absolute inset-0 size-full rounded-[inherit]" />;
}
