import type { Category, Product } from "@/types/db";

export const featuredHref = "/featured";

export const browseDepartments = [
  { label: "Dairy", slug: "dairy-bread-eggs" },
  { label: "Produce", slug: "vegetables-fruits" },
  { label: "Snacks", slug: "munchies-snacks" },
  { label: "Drinks", slug: "cold-drinks-juices" },
] as const;

const departmentGroups: Record<string, { label: string; matches: RegExp }[]> = {
  "dairy-bread-eggs": [
    { label: "Milk", matches: /\b(milk|taaza)\b/i },
    { label: "Curd & Yogurt", matches: /\b(curd|yogurt|yoghurt|dahi|doi)\b/i },
    { label: "Butter & Cheese", matches: /\b(butter|cheese|paneer)\b/i },
    { label: "Eggs", matches: /\beggs?\b/i },
    { label: "Bread", matches: /\b(bread|bakery|bun)\b/i },
  ],
  "vegetables-fruits": [
    { label: "Vegetables", matches: /\b(vegetables?|onions?|potato(?:es)?|tomato(?:es)?|cucumbers?|kheera|aloo|pyaz)\b/i },
    { label: "Fruits", matches: /\b(fruits?|bananas?|apples?|watermelons?|papayas?)\b/i },
    { label: "Leafy & Herbs", matches: /\b(leafy|herbs?|coriander|spinach|palak|mint|leaves)\b/i },
  ],
  "munchies-snacks": [
    { label: "Chips", matches: /\b(chips|crisps|kurkure|tedhe|takatak|namkeen)\b/i },
    { label: "Biscuits", matches: /\b(biscuits?|cookies?|oreo|parle|crackers?)\b/i },
    { label: "Chocolates", matches: /\b(chocolates?|kitkat|ferrero|silk)\b/i },
  ],
  "cold-drinks-juices": [
    { label: "Cold Drinks", matches: /\b(cola|coca|thums|sprite|fanta|soda)\b/i },
    { label: "Juices", matches: /\b(juices?|aamras|tropicana|nectar)\b/i },
    { label: "Energy & Water", matches: /\b(energy|water|redbull|monster|sting|bisleri)\b/i },
  ],
};

type BrowseGroup = { id: string; label: string; products: Product[]; image?: string | null };

export function browseGroups(category: Category, subcategories: Category[], products: Product[]): BrowseGroup[] {
  const catalog = products.filter((product) => product.variants?.length);
  if (subcategories.length) {
    const childIds = new Set(subcategories.map(({ id }) => id));
    const groups = subcategories.map((child) => ({
      id: child.id, label: child.name, image: child.image_url,
      products: catalog.filter((product) => product.category_id === child.id),
    }));
    const remaining = catalog.filter((product) => !childIds.has(product.category_id ?? ""));
    return remaining.length ? [...groups, { id: category.id, label: "Other", image: category.image_url, products: remaining }] : groups;
  }

  const definitions = departmentGroups[category.slug];
  if (!definitions) return [{ id: category.id, label: category.name, image: category.image_url, products: catalog }];

  const groups: BrowseGroup[] = definitions.map(({ label }) => ({ id: label, label, products: [] }));
  const other: BrowseGroup = { id: "other", label: "Other", products: [] };
  // Give specific matches precedence over broad tags such as "vegetable" or "chocolate".
  const priority = category.slug === "vegetables-fruits" ? [2, 1, 0]
    : category.slug === "munchies-snacks" ? [1, 0, 2] : definitions.map((_, index) => index);
  for (const product of catalog) {
    const text = [product.name, ...(product.tags ?? [])].join(" ");
    const index = priority.find((position) => definitions[position].matches.test(text));
    (index === undefined ? other : groups[index]).products.push(product);
  }
  return other.products.length ? [...groups, other] : groups;
}

export function browsePrice(product: Product) {
  const variant = product.variants?.[0];
  return variant?.effective_price ?? variant?.base_price ?? 0;
}

export function browseDiscount(product: Product) {
  const mrp = product.variants?.[0]?.mrp ?? 0;
  const price = browsePrice(product);
  return mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
}

type BrowseCatalog = { categories: Category[]; products: Product[] };
export type CategoryData = { category: Category; subcategories: Category[]; products: Product[] };

export async function fetchBrowseCatalog(storeId: string | null, signal: AbortSignal) {
  const url = storeId ? `/api/home?storeId=${encodeURIComponent(storeId)}` : "/api/home";
  const response = await fetch(url, { signal });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Could not load the storefront");
  return result.data as BrowseCatalog;
}

export async function fetchBrowseCategory(slug: string, storeId: string | null, signal: AbortSignal) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const response = await fetch(`/api/categories/${encodeURIComponent(slug)}/products${query}`, { signal });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Category unavailable");
  return result.data as CategoryData;
}

const highlights = [
  { department: "Munchies & Snacks", category: "munchies-snacks", slug: "kurkure-masala-munch" },
  { department: "Cold Drinks", category: "cold-drinks-juices", slug: "coca-cola-original" },
  { department: "Dairy", category: "dairy-bread-eggs", slug: "amul-taaza-milk" },
];

export function featuredAssortment(data?: BrowseCatalog) {
  const available = data?.products.filter((product) =>
    product.variants?.length && (product.variants[0].stock_available ?? 1) > 0) ?? [];
  const heroes = highlights.flatMap(({ department, category, slug }, index) => {
    const categoryId = data?.categories.find((entry) => entry.slug === category)?.id;
    const product = available.find((entry) => entry.slug === slug) ??
      available.find((entry) => entry.category_id === categoryId);
    return product ? [{ product, department, index }] : [];
  });
  const newLaunches = available.slice(0, 5);
  const deals = available.filter((product) => browsePrice(product) < 50).slice(0, 6);
  const latestIds = new Set(newLaunches.map(({ id }) => id));
  const trending = [...available].sort((a, b) => {
    const byRatings = (b.review_count ?? 0) - (a.review_count ?? 0);
    return byRatings || Number(latestIds.has(a.id)) - Number(latestIds.has(b.id));
  }).slice(0, 5);
  return { heroes, newLaunches, deals, trending };
}
