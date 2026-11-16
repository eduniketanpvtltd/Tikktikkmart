-- Section 10.3 critical functions

create or replace function find_serving_store(p_lat double precision, p_lng double precision)
returns setof stores language sql stable as $$
  select s.* from stores s
  where s.is_active and s.is_accepting_orders
    and (
      (s.service_area is not null and st_covers(s.service_area, st_point(p_lng,p_lat)::geography))
      or (s.service_area is null and st_dwithin(s.location, st_point(p_lng,p_lat)::geography, s.service_radius_m))
    )
  order by st_distance(s.location, st_point(p_lng,p_lat)::geography) limit 1;
$$;

create or replace function nearest_available_riders(p_store uuid, p_radius_m int, p_limit int)
returns table(rider_id uuid, distance_m double precision, rating numeric)
language sql stable as $$
  select rl.rider_id, st_distance(rl.location, s.location), rp.rating
  from rider_locations rl
  join rider_profiles rp on rp.user_id = rl.rider_id
  join stores s on s.id = p_store
  where rp.is_online and not rp.on_delivery and rp.kyc_status='approved'
    and st_dwithin(rl.location, s.location, p_radius_m)
  order by st_distance(rl.location, s.location)
  limit p_limit;
$$;

-- Legal transitions (section 5.1)
create or replace function is_valid_transition(f order_status, t order_status) returns boolean
language sql immutable as $$
  select case f
    when 'placed' then t in ('payment_pending','confirmed','cancelled')
    when 'payment_pending' then t in ('confirmed','payment_failed','cancelled')
    when 'confirmed' then t in ('accepted_by_store','rejected_by_store','cancelled')
    when 'accepted_by_store' then t in ('picking','cancelled','rejected_by_store')
    when 'picking' then t in ('packed','cancelled')
    when 'packed' then t in ('rider_assigned','cancelled')
    when 'rider_assigned' then t in ('rider_at_store','packed','cancelled')
    when 'rider_at_store' then t in ('picked_up','cancelled')
    when 'picked_up' then t in ('out_for_delivery')
    when 'out_for_delivery' then t in ('arrived','delivery_failed')
    when 'arrived' then t in ('delivered','delivery_failed')
    when 'cancelled' then t in ('refunded')
    when 'payment_failed' then false
    else false end;
$$;

create or replace function transition_order(
  p_order uuid, p_to order_status, p_actor uuid, p_actor_role user_role,
  p_note text default null, p_lat double precision default null, p_lng double precision default null
) returns orders language plpgsql as $$
declare o orders; it record; old_status order_status;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  old_status := o.status;
  if not is_valid_transition(o.status, p_to) then
    raise exception 'illegal transition % -> %', o.status, p_to;
  end if;

  update orders set status = p_to,
    delivered_at = case when p_to='delivered' then now() else delivered_at end
  where id = p_order returning * into o;

  insert into order_status_history(order_id, from_status, to_status, actor_id, actor_role, location, note)
  values (p_order, old_status, p_to, p_actor, p_actor_role,
          case when p_lat is not null then st_point(p_lng,p_lat)::geography end, p_note);

  if p_to = 'delivered' then
    for it in select variant_id, quantity from order_items where order_id=p_order and status<>'out_of_stock' loop
      update store_inventory set quantity = quantity - it.quantity, reserved = greatest(reserved - it.quantity,0), updated_at=now()
        where store_id=o.store_id and variant_id=it.variant_id;
      insert into inventory_movements(store_id,variant_id,delta,reason,ref_id,actor_id)
        values (o.store_id,it.variant_id,-it.quantity,'order_commit',p_order,p_actor);
    end loop;
  elsif p_to in ('cancelled','rejected_by_store','payment_failed') then
    for it in select variant_id, quantity from order_items where order_id=p_order loop
      update store_inventory set reserved = greatest(reserved - it.quantity,0), updated_at=now()
        where store_id=o.store_id and variant_id=it.variant_id;
      insert into inventory_movements(store_id,variant_id,delta,reason,ref_id,actor_id)
        values (o.store_id,it.variant_id,it.quantity,'order_release',p_order,p_actor);
    end loop;
  end if;
  return o;
end $$;

-- place_order: p_items = [{"variant_id": "...", "quantity": n}], prices recomputed server-side.
create or replace function place_order(
  p_user uuid, p_store uuid, p_address uuid, p_method payment_method,
  p_items jsonb, p_tip numeric default 0, p_instructions text default null, p_idem text default null,
  p_delivery_fee numeric default 0, p_handling_fee numeric default 0, p_small_cart_fee numeric default 0,
  p_discount numeric default 0, p_coupon text default null
) returns orders language plpgsql as $$
declare
  o orders; itm jsonb; inv store_inventory; v product_variants; p products;
  price numeric; items_total numeric := 0; tax numeric := 0; addr addresses; qty int;
begin
  if p_idem is not null then
    select * into o from orders where idempotency_key = p_idem;
    if found then return o; end if;
  end if;
  select * into addr from addresses where id = p_address and user_id = p_user;
  if not found then raise exception 'invalid address'; end if;

  -- pass 1: lock & verify stock, compute totals
  for itm in select * from jsonb_array_elements(p_items) order by (value->>'variant_id') loop
    qty := (itm->>'quantity')::int;
    select * into v from product_variants where id=(itm->>'variant_id')::uuid and is_active;
    if not found then raise exception 'variant unavailable'; end if;
    if qty > v.max_qty_per_order then raise exception 'qty exceeds limit for %', v.label; end if;
    select * into inv from store_inventory where store_id=p_store and variant_id=v.id for update;
    if not found or not inv.is_available or inv.quantity - inv.reserved < qty then
      raise exception 'insufficient stock for variant %', v.id;
    end if;
    select * into p from products where id=v.product_id;
    price := coalesce(inv.price_override, v.base_price);
    items_total := items_total + price*qty;
    tax := tax + round(price*qty*p.gst_rate/(100+p.gst_rate),2);
  end loop;

  insert into orders(user_id,store_id,address_id,address_snapshot,status,payment_method,
    items_total,discount,delivery_fee,handling_fee,small_cart_fee,tip,tax_total,grand_total,
    coupon_code,delivery_otp,pickup_code,instructions,idempotency_key)
  values (p_user,p_store,p_address,to_jsonb(addr),
    case when p_method='cod' then 'confirmed'::order_status else 'payment_pending'::order_status end,
    p_method,items_total,p_discount,p_delivery_fee,p_handling_fee,p_small_cart_fee,p_tip,tax,
    items_total - p_discount + p_delivery_fee + p_handling_fee + p_small_cart_fee + p_tip,
    p_coupon, lpad((floor(random()*10000))::int::text,4,'0'), lpad((floor(random()*10000))::int::text,4,'0'),
    p_instructions,p_idem)
  returning * into o;

  for itm in select * from jsonb_array_elements(p_items) loop
    qty := (itm->>'quantity')::int;
    select * into v from product_variants where id=(itm->>'variant_id')::uuid;
    select * into p from products where id=v.product_id;
    select * into inv from store_inventory where store_id=p_store and variant_id=v.id;
    insert into order_items(order_id,variant_id,name_snapshot,label_snapshot,image_snapshot,mrp,unit_price,gst_rate,quantity)
      values (o.id,v.id,p.name,v.label,p.images[1],v.mrp,coalesce(inv.price_override,v.base_price),p.gst_rate,qty);
    update store_inventory set reserved=reserved+qty, updated_at=now() where store_id=p_store and variant_id=v.id;
    insert into inventory_movements(store_id,variant_id,delta,reason,ref_id,actor_id)
      values (p_store,v.id,-qty,'order_reserve',o.id,p_user);
  end loop;

  insert into order_status_history(order_id,to_status,actor_id,actor_role) values (o.id,o.status,p_user,'customer');
  return o;
end $$;

create or replace function release_expired_reservations() returns int language plpgsql as $$
declare r record; n int := 0;
begin
  for r in select id from orders where status='payment_pending' and placed_at < now() - interval '10 minutes' loop
    perform transition_order(r.id,'payment_failed',null,null,'payment timeout');
    n := n+1;
  end loop;
  return n;
end $$;

select cron.schedule('release-expired-reservations','* * * * *','select release_expired_reservations()');
