-- Captured payments must retain their reservations until reconciliation moves the order forward.
create or replace function public.release_expired_reservations()
returns int language plpgsql as $$
declare
  candidate record;
  released int := 0;
begin
  for candidate in
    select orders.id from public.orders
      where status = 'payment_pending'
        and payment_status is distinct from 'captured'
        and payment_status is distinct from 'authorized'
        and placed_at < now() - interval '10 minutes'
        and not exists (
          select 1 from public.payments
            where order_id = orders.id and status in ('authorized', 'captured')
        )
      for update skip locked
  loop
    perform public.transition_order(candidate.id, 'payment_failed', null, null, 'payment timeout');
    released := released + 1;
  end loop;
  return released;
end;
$$;
