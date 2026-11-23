export async function getProductData<T>(slug: string, storeId: string | null, signal: AbortSignal, related = false): Promise<T> {
  const params = new URLSearchParams();
  if (storeId) params.set("storeId", storeId);
  if (related) params.set("related", "1");
  const query = params.size ? `?${params}` : "";
  const response = await fetch(`/api/products/${encodeURIComponent(slug)}${query}`, { signal });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error("Product unavailable");
  return json.data;
}
