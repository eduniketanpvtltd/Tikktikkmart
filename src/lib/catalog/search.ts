import type { Product } from "@/types/db";

const equivalents = new Map(Object.entries({
  cola: ["cola", "coke"],
  chip: ["chip", "crisp"],
  potato: ["potato", "aloo"],
  onion: ["onion", "pyaz"],
  curd: ["curd", "dahi", "yogurt", "yoghurt"],
}));

const common = new Map(Object.entries({
  tomatoes: "tomato", potatoes: "potato", coke: "cola", crisps: "chip", crisp: "chip",
  aloo: "potato", pyaz: "onion", dahi: "curd", yogurt: "curd", yoghurt: "curd",
  pyaaz: "onion", tamatar: "tomato", doodh: "milk", anda: "egg", ande: "egg", kela: "banana",
  "आलू": "potato", "प्याज": "onion", "प्याज़": "onion", "टमाटर": "tomato", "दूध": "milk",
  "अंडा": "egg", "अंडे": "egg", "दही": "curd", "केला": "banana", "मक्खन": "butter", "आटा": "atta",
}));

function tokenize(text: string) {
  return text.toLowerCase().normalize("NFKC").replace(/['’]/g, "").match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
}

export function searchWords(value: string) {
  return [...new Set(tokenize(value.slice(0, 120)).slice(0, 16).map((word) =>
    common.get(word) ?? (/[^s]s$/.test(word) && word.length > 3 ? common.get(word.slice(0, -1)) ?? word.slice(0, -1) : word)
  ))];
}

export function searchExpression(words: string[]) {
  return words.map((word) => `(${(equivalents.get(word) ?? [word]).map((variant) => `${variant}:*`).join(" | ")})`).join(" & ");
}

function fields(product: Product) {
  return [product.name, product.brand, ...(product.tags ?? []), product.slug].flatMap((value) => searchWords(value ?? ""));
}

function nearMatch(a: string, b: string) {
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let first = 0;
  while (first < Math.min(a.length, b.length) && a[first] === b[first]) first++;
  if (a.length === b.length) {
    return a.slice(first + 1) === b.slice(first + 1) ||
      (a[first] === b[first + 1] && a[first + 1] === b[first] && a.slice(first + 2) === b.slice(first + 2));
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.slice(first) === long.slice(first + 1);
}

export function rankSearchProducts(products: Product[], words: string[], fuzzy = false) {
  if (!words.length) return [];
  return products.flatMap((product) => {
    const tokens = fields(product);
    const names = searchWords(product.name);
    let score = 0;
    for (const word of words) {
      if (names.includes(word)) score += 9;
      else if (tokens.includes(word)) score += 6;
      else if (tokens.some((token) => token.startsWith(word))) score += 4;
      else if (fuzzy && tokens.some((token) => nearMatch(word, token))) score += 1;
      else return [];
    }
    return [{ product, score }];
  }).sort((a, b) => b.score - a.score).map(({ product }) => product);
}

export function relatedSearchProducts(catalog: Product[], matches: Product[], words: string[]) {
  const excluded = new Set(matches.map(({ id }) => id));
  const categories = new Set(matches.map(({ category_id }) => category_id).filter(Boolean));
  const shared = new Set(matches.flatMap((product) => searchWords((product.tags ?? []).join(" "))));
  return catalog.flatMap((product) => {
    if (excluded.has(product.id)) return [];
    const tokens = fields(product);
    const inCategory = product.category_id && categories.has(product.category_id);
    const overlap = words.filter((word) => tokens.some((token) => token === word || word.length >= 3 && token.startsWith(word))).length;
    if (!inCategory && !overlap) return [];
    const tagOverlap = tokens.filter((token) => shared.has(token)).length;
    return [{ product, score: (inCategory ? 12 : 0) + overlap * 4 + tagOverlap }];
  }).sort((a, b) => b.score - a.score).map(({ product }) => product);
}
