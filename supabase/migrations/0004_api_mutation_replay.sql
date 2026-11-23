-- Authenticated API mutations claim a key before executing a side effect.
create table if not exists public.api_mutation_requests (
  user_id uuid not null references public.users(id) on delete cascade,
  request_key uuid not null,
  fingerprint text not null,
  status_code integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, request_key)
);
alter table public.api_mutation_requests enable row level security;
revoke all on public.api_mutation_requests from public, anon, authenticated;
grant select, insert, update, delete on public.api_mutation_requests to service_role;

create index if not exists api_mutation_requests_created_at on public.api_mutation_requests(created_at);
