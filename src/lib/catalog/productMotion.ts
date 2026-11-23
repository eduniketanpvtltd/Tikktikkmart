"use client";

import type { PointerEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";
import type { Product } from "@/types/db";

const sharedImageName = "storefront-product-image";
const productPath = "/product/";
let pendingProduct: { slug: string; fromProduct: boolean; fromCard: boolean } | undefined;

function matchingCard(slug: string) {
  const cards = [...document.querySelectorAll<HTMLElement>(`[data-card-image="${CSS.escape(slug)}"]`)];
  return cards.find((card) => {
    const rect = card.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }) ?? cards[0];
}

function transitionImage(source: HTMLElement | null, navigate: () => void, findTarget: () => HTMLElement | null | undefined) {
  if (!source || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    navigate();
    return;
  }

  const root = document.documentElement;
  let target: HTMLElement | undefined;
  root.dataset.productTransition = "";
  source.style.viewTransitionName = sharedImageName;
  const transition = document.startViewTransition(() => new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      source.style.viewTransitionName = "";
      resolve();
    };
    const observer = new MutationObserver(() => {
      const next = findTarget();
      if (!next || next === source) return;
      finish();
      target = next;
      target.style.viewTransitionName = sharedImageName;
    });
    const timeout = window.setTimeout(finish, 1200);
    observer.observe(document.body, { childList: true, subtree: true });
    navigate();
  }));
  void transition.finished.catch(() => {}).finally(() => {
    source.style.viewTransitionName = "";
    if (target) target.style.viewTransitionName = "";
    delete root.dataset.productTransition;
  });
}

export function useOpenProduct() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (product: Product, source: HTMLElement | null) => {
    const { slug } = product;
    const key = ["product-detail", slug, useCartStore.getState().storeId];
    if (!queryClient.getQueryData(key)) queryClient.setQueryData(key, product, { updatedAt: 0 });

    const fromProduct = window.location.pathname.startsWith(productPath);
    const sharedSource = !fromProduct && source && typeof document.startViewTransition === "function"
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? source : null;
    pendingProduct = { slug, fromProduct, fromCard: Boolean(sharedSource) };
    transitionImage(sharedSource, () => router.push(`${productPath}${slug}`),
      () => document.querySelector<HTMLElement>(`[data-detail-image="${CSS.escape(slug)}"]`));
  };
}

export function registerProductArrival(slug: string) {
  if (pendingProduct?.slug !== slug) return Boolean(history.state?.productFromProduct);
  const { fromProduct, fromCard } = pendingProduct;
  pendingProduct = undefined;
  history.replaceState({
    ...history.state,
    productOpenedInApp: true,
    productFromProduct: fromProduct,
    productFromCard: fromCard,
  }, "");
  window.scrollTo(0, 0);
  return fromProduct;
}

export function closeProductTransition(slug: string, back: () => void, home: () => void) {
  if (!history.state?.productOpenedInApp) {
    home();
    return;
  }
  if (!history.state.productFromCard) {
    back();
    return;
  }
  const source = document.querySelector<HTMLElement>(`[data-detail-image="${CSS.escape(slug)}"]`);
  transitionImage(source, back, () => source?.isConnected && source.dataset.detailImage === slug ? null : matchingCard(slug));
}

function releaseTilt(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--press-x");
  event.currentTarget.style.removeProperty("--press-y");
  event.currentTarget.style.removeProperty("--press-scale");
}

export const pressTilt = {
  onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = 0.5 - (event.clientY - rect.top) / rect.height;
    const y = (event.clientX - rect.left) / rect.width - 0.5;
    const strength = Math.min(28, 14 / Math.hypot(x, y));
    event.currentTarget.style.setProperty("--press-x", `${x * strength}deg`);
    event.currentTarget.style.setProperty("--press-y", `${y * strength}deg`);
    event.currentTarget.style.setProperty("--press-scale", ".97");
  },
  onPointerUp: releaseTilt,
  onPointerCancel: releaseTilt,
  onPointerLeave: releaseTilt,
};
