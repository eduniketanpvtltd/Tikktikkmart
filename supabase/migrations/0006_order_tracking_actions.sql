alter table public.orders
  add column if not exists customer_rating smallint check (customer_rating between 1 and 5);

create or replace function public.add_order_item(p_order uuid, p_user uuid, p_variant uuid)
returns void language plpgsql set search_path = public as $$
declare
  existing_order orders;
  variant product_variants;
  product products;
  stock store_inventory;
  price numeric;
begin
  select * into existing_order from orders where id = p_order and user_id = p_user for update;
  if not found then raise exception 'Order not found'; end if;

  -- One add-on per variant. Retrying a committed mutation cannot reserve it twice.
  if exists (select 1 from order_items where order_id = p_order and variant_id = p_variant) then return; end if;
  if existing_order.payment_method <> 'cod' or existing_order.status not in ('placed', 'confirmed')
    or existing_order.placed_at is null or existing_order.placed_at <= clock_timestamp() - interval '2 minutes' then
    raise exception 'The add-on window has closed';
  end if;

  select * into variant from product_variants where id = p_variant and is_active and max_qty_per_order >= 1;
  if not found then raise exception 'This item is no longer available'; end if;
  select * into product from products where id = variant.product_id and is_active;
  if not found then raise exception 'This item is no longer available'; end if;
  select * into stock from store_inventory where store_id = existing_order.store_id and variant_id = p_variant for update;
  if not found or stock.is_available is distinct from true or stock.quantity - stock.reserved < 1 then
    raise exception 'This item is out of stock';
  end if;

  price := coalesce(stock.price_override, variant.base_price);
  if existing_order.grand_total + price > 2000 then raise exception 'Cash on delivery is limited to ₹2,000'; end if;

  insert into order_items(order_id, variant_id, name_snapshot, label_snapshot, image_snapshot, mrp, unit_price, gst_rate, quantity)
  values (p_order, p_variant, product.name, variant.label, product.images[1], variant.mrp, price, product.gst_rate, 1);
  update store_inventory set reserved = reserved + 1, updated_at = now()
    where store_id = existing_order.store_id and variant_id = p_variant;
  insert into inventory_movements(store_id, variant_id, delta, reason, ref_id, actor_id)
    values (existing_order.store_id, p_variant, -1, 'order_reserve', p_order, p_user);
  update orders set
    items_total = coalesce(items_total, 0) + price,
    tax_total = coalesce(tax_total, 0) + round(price * product.gst_rate / (100 + product.gst_rate), 2),
    grand_total = grand_total + price
    where id = p_order;
end;
$$;

revoke all on function public.add_order_item(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.add_order_item(uuid, uuid, uuid) to service_role;
