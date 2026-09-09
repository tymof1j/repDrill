create table if not exists public.bundle_import_receipts (
  user_id uuid not null references public.users(id) on delete cascade,
  fingerprint text not null,
  summary jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, fingerprint)
);
alter table public.bundle_import_receipts enable row level security;
revoke all on public.bundle_import_receipts from anon, authenticated;
