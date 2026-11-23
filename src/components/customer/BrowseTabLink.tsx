"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";
import { fetchBrowseCatalog, fetchBrowseCategory } from "@/lib/catalog/browse";
import { useIntentPrefetch } from "@/lib/ui/useIntentPrefetch";

export function BrowseTabLink({ href, children, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const query = useQueryClient();
  const intent = useIntentPrefetch(href, () => {
    const { storeId } = useCartStore.getState();
    const slug = href.startsWith("/category/") ? href.slice("/category/".length) : "";
    if (slug) void query.prefetchQuery({
      queryKey: ["category-detail", slug, storeId],
      queryFn: ({ signal }) => fetchBrowseCategory(slug, storeId, signal),
    });
    else void query.prefetchQuery({ queryKey: ["home", storeId], queryFn: ({ signal }) => fetchBrowseCatalog(storeId, signal) });
  }, href === "/" || href === "/featured");
  return <Link {...props} {...intent} href={href}>{children}</Link>;
}
