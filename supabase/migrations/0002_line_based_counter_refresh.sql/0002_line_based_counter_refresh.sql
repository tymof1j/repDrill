-- Replace position/card totals with terminal training-line aggregates.
-- A line is one root-to-leaf path in a chapter's move graph. A line is due
-- when at least one of its repertoire moves has a reviewed card due now.
alter table public.counter_refresh_jobs
  add column if not exists force_refresh boolean not null default false;

create index if not exists moves_chapter_parent_idx
  on public.moves(chapter_id, parent_position_id);

create or replace function public.refresh_counter_snapshots(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.counter_snapshots where user_id = p_user_id;

  with recursive
  chapter_moves as (
    select
      m.id,
      m.chapter_id,
      ch.course_id,
      m.parent_position_id,
      m.child_position_id,
      m.uci,
      m.move_type
    from public.moves m
    join public.chapters ch on ch.id = m.chapter_id
    join public.courses c on c.id = ch.course_id
    where c.user_id = p_user_id
  ),
  roots as (
    select m.*
    from chapter_moves m
    where not exists (
      select 1
      from chapter_moves previous
      where previous.chapter_id = m.chapter_id
        and previous.child_position_id = m.parent_position_id
    )
  ),
  paths (chapter_id, course_id, position_id, move_ids, line_key, positions) as (
    select
      r.chapter_id,
      r.course_id,
      r.child_position_id,
      array[r.id]::uuid[],
      r.uci::text,
      array[r.parent_position_id, r.child_position_id]::uuid[]
    from roots r
    union all
    select
      p.chapter_id,
      p.course_id,
      next_move.child_position_id,
      array_append(p.move_ids, next_move.id),
      p.line_key || ' ' || next_move.uci,
      array_append(p.positions, next_move.child_position_id)
    from paths p
    join chapter_moves next_move
      on next_move.chapter_id = p.chapter_id
     and next_move.parent_position_id = p.position_id
    where not (next_move.child_position_id = any(p.positions))
  ),
  leaf_lines as (
    select p.*
    from paths p
    where not exists (
      select 1
      from chapter_moves next_move
      where next_move.chapter_id = p.chapter_id
        and next_move.parent_position_id = p.position_id
    )
  ),
  line_status as (
    select
      line.course_id,
      line.chapter_id,
      line.line_key,
      coalesce(bool_or(move.move_type = 'repertoire'), false) as has_repertoire,
      coalesce(bool_or(move.move_type = 'repertoire' and (card.last_review is not null or card.state <> 0)), false) as learned,
      coalesce(bool_or(move.move_type = 'repertoire' and card.due <= now() and (card.last_review is not null or card.state <> 0)), false) as due,
      coalesce(bool_or(move.move_type = 'repertoire' and card.last_review is null and card.state = 0), false) as is_new
    from leaf_lines line
    cross join lateral unnest(line.move_ids) as line_move(move_id)
    join chapter_moves move on move.id = line_move.move_id
    left join public.review_cards card
      on card.user_id = p_user_id
     and card.move_id = move.id
    group by line.course_id, line.chapter_id, line.line_key
  ),
  trainable_lines as (
    select status.*
    from line_status status
    left join public.chapter_line_settings setting
      on setting.chapter_id = status.chapter_id
     and setting.line_key = status.line_key
    where status.has_repertoire
      and not coalesce(setting.info_only, false)
  ),
  course_totals as (
    select
      course_id,
      count(*)::integer as total_lines,
      count(*) filter (where learned)::integer as learned_lines,
      count(*) filter (where due)::integer as due_lines,
      count(*) filter (where is_new)::integer as new_lines
    from trainable_lines
    group by course_id
  )
  insert into public.counter_snapshots (
    user_id,
    course_id,
    total_lines,
    learned_lines,
    due_lines,
    new_lines,
    computed_at
  )
  select
    p_user_id,
    c.id,
    coalesce(t.total_lines, 0),
    coalesce(t.learned_lines, 0),
    coalesce(t.due_lines, 0),
    coalesce(t.new_lines, 0),
    now()
  from public.courses c
  left join course_totals t on t.course_id = c.id
  where c.user_id = p_user_id;

  insert into public.counter_snapshots (
    user_id,
    course_id,
    total_lines,
    learned_lines,
    due_lines,
    new_lines,
    computed_at
  )
  select
    p_user_id,
    null,
    coalesce(sum(total_lines), 0)::integer,
    coalesce(sum(learned_lines), 0)::integer,
    coalesce(sum(due_lines), 0)::integer,
    coalesce(sum(new_lines), 0)::integer,
    now()
  from public.counter_snapshots
  where user_id = p_user_id and course_id is not null;
end;
$$;

-- Run queued jobs in the database so the one-minute refresh does not depend
-- on a Vercel plan or on a browser being open. The same activity guard as the
-- HTTP fallback is kept here: a queued non-forced job is a no-op unless a
-- review happened after the last aggregate snapshot.
create or replace function public.process_counter_refresh_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  job record;
  computed_at timestamptz;
  reviewed_at timestamptz;
  refreshed integer := 0;
begin
  for job in
    select user_id, force_refresh
    from public.counter_refresh_jobs
    where status = 'queued'
       or (status = 'running' and started_at < now() - interval '30 minutes')
    order by requested_at
    limit 100
    for update skip locked
  loop
    update public.counter_refresh_jobs
    set status = 'running', started_at = now(), error = null
    where user_id = job.user_id;

    select max(cs.computed_at)
    into computed_at
    from public.counter_snapshots cs
    where cs.user_id = job.user_id and cs.course_id is null;

    select max(rl.reviewed_at)
    into reviewed_at
    from public.review_logs rl
    join public.review_cards rc on rc.id = rl.card_id
    where rc.user_id = job.user_id;

    if job.force_refresh or computed_at is null or reviewed_at > computed_at then
      perform public.refresh_counter_snapshots(job.user_id);
      refreshed := refreshed + 1;
    end if;

    update public.counter_refresh_jobs
    set status = 'done', force_refresh = false, completed_at = now()
    where user_id = job.user_id;
  end loop;

  return refreshed;
end;
$$;

-- Existing snapshots were produced by the old position-based function. Queue
-- one forced rebuild per user so the first cron tick converts them safely.
insert into public.counter_refresh_jobs (user_id, requested_at, status, force_refresh, error)
select id, now(), 'queued', true, null
from public.users
on conflict (user_id) do update
set requested_at = excluded.requested_at,
    status = 'queued',
    force_refresh = true,
    error = null;

-- Supabase projects expose pg_cron through the Cron module. Keep this block
-- optional so applying the schema still succeeds if the module has not been
-- enabled yet; the README contains the one-line dashboard fallback.
do $schedule$
declare
  existing_job_id bigint;
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      execute 'create extension if not exists pg_cron';
      execute 'select jobid from cron.job where jobname = $1'
        into existing_job_id
        using 'repdrill-counter-refresh';
      if existing_job_id is not null then
        execute 'select cron.unschedule($1)' using existing_job_id;
      end if;
      execute 'select cron.schedule($1, $2, $3)'
        using 'repdrill-counter-refresh', '* * * * *', 'select public.process_counter_refresh_jobs();';
    exception when others then
      null;
    end;
  end if;
end;
$schedule$;
