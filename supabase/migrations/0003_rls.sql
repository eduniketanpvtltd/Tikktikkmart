-- Section 10.4. All writes go through the server (service role bypasses RLS).
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename <> 'spatial_ref_sys' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Public catalog reads
create policy "catalog read categories" on categories for select using (is_active);
create policy "catalog read products" on products for select using (is_active);
create policy "catalog read variants" on product_variants for select using (is_active);
create policy "banners read" on banners for select using (is_active);
create policy "collections read" on collections for select using (is_active);

-- Realtime reads use a minted JWT with sub = users.id
create policy "own orders" on orders for select using (user_id = auth.uid() or rider_id = auth.uid()
  or store_id in (select store_id from store_staff where user_id = auth.uid()));
create policy "own order items" on order_items for select using (
  order_id in (select id from orders where user_id = auth.uid() or rider_id = auth.uid()
    or store_id in (select store_id from store_staff where user_id = auth.uid())));
create policy "own history" on order_status_history for select using (
  order_id in (select id from orders where user_id = auth.uid() or rider_id = auth.uid()));
create policy "rider location for active order" on rider_locations for select using (
  rider_id in (select rider_id from orders where user_id = auth.uid()
    and status in ('rider_assigned','rider_at_store','picked_up','out_for_delivery','arrived')));
