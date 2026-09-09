-- Imported puzzle courses solve positions without putting them into FSRS.
alter table public.courses add column if not exists training_mode text not null default 'theory'
  check (training_mode in ('theory', 'puzzles'));
create table if not exists public.puzzle_line_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  line_key text not null,
  attempts integer not null default 0,
  successes integer not null default 0,
  last_success boolean not null,
  last_attempt_at timestamptz not null,
  primary key (user_id, chapter_id, line_key)
);
alter table public.puzzle_line_progress enable row level security;
revoke all on public.puzzle_line_progress from anon, authenticated;
