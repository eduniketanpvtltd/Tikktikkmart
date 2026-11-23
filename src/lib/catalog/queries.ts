import { db } from "@/lib/supabase/server";
import type { Product, ProductVariant } from "@/types/db";

const inventoryFields = "quantity,reserved,price_override,is_available,rack_location";

type InventoryRow = {
  quantity: number;
  reserved: number;
  price_override: number | null;
  is_available: boolean;
  rack_location: string | null;
};

type CatalogRow = Omit<Product, "variants"> & { variants: (ProductVariant & { inventory?: InventoryRow[] })[] };

export function activeCatalogProducts(storeId: string | null) {
  const select = storeId
    ? `*,variants:product_variants(*,inventory:store_inventory(${inventoryFields}))`
    : "*,variants:product_variants(*)";
  const query = db.from("products").select(select).eq("is_active", true).eq("variants.is_active", true);
  return storeId ? query.eq("variants.inventory.store_id", storeId) : query;
}

export function stockedVariant(variant: ProductVariant, inventory: InventoryRow | undefined, storeId: string | null) {
  return {
    ...variant,
    mrp: Number(variant.mrp),
    base_price: Number(variant.base_price),
    effective_price: Number(inventory?.price_override ?? variant.base_price),
    stock_available: storeId
      ? inventory?.is_available ? Math.max(0, inventory.quantity - inventory.reserved) : 0
      : 99,
    rack_location: inventory?.rack_location ?? null,
  };
}

export function catalogProduct(row: unknown, storeId: string | null): Product {
  const product = row as CatalogRow;
  return {
    ...product,
    variants: product.variants.map(({ inventory, ...variant }) => stockedVariant(variant, inventory?.[0], storeId)),
  };
}
