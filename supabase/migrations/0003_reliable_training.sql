-- Durable browser outbox receipts and the complete ts-fsrs card state.
-- Additive: existing reviews, courses and schedules remain intact.
alter table public.review_cards add column if not exists learning_steps integer not null default 0;
create table if not exists public.training_events (
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.training_events enable row level security;
-- Access is server-only through the authenticated backend, just like cards.
revoke all on public.training_events from anon, authenticated;
create index if not exists review_cards_move_idx on public.review_cards(move_id);

alter table public.course_imports add column if not exists request_id uuid;
create unique index if not exists course_imports_request_idx on public.course_imports(user_id, request_id);
