-- Keep training saves idempotent so a background retry cannot duplicate a
-- review log after the server has committed but the browser lost the reply.
alter table public.review_logs
  add column if not exists save_batch_id text,
  add column if not exists save_sequence integer;

create unique index if not exists review_logs_save_batch_sequence_idx
  on public.review_logs(save_batch_id, save_sequence)
  where save_batch_id is not null and save_sequence is not null;

-- A refresh job can now target only the courses whose lines were just saved.
-- The user-level snapshot is still rebuilt from the already-cached course
-- snapshots, so this aggregate step is cheap and does not traverse every
-- course on every review.
alter table public.counter_refresh_jobs
  add column if not exists course_ids uuid[];

create or replace function public.refresh_counter_snapshots(p_user_id uuid, p_course_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rebuild the aggregate from cached course rows, but only recompute the
  -- course rows requested by this job.
  delete from public.counter_snapshots
  where user_id = p_user_id
    and (course_id is null or p_course_ids is null or course_id = any(p_course_ids));

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
      and (p_course_ids is null or c.id = any(p_course_ids))
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
    user_id, course_id, total_lines, learned_lines, due_lines, new_lines, computed_at
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
  where c.user_id = p_user_id
    and (p_course_ids is null or c.id = any(p_course_ids));

  insert into public.counter_snapshots (
    user_id, course_id, total_lines, learned_lines, due_lines, new_lines, computed_at
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
    select user_id, force_refresh, course_ids
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
    join public.moves m on m.id = rc.move_id
    join public.chapters ch on ch.id = m.chapter_id
    where rc.user_id = job.user_id
      and (job.course_ids is null or ch.course_id = any(job.course_ids));

    if job.force_refresh or computed_at is null or reviewed_at > computed_at then
      perform public.refresh_counter_snapshots(job.user_id, job.course_ids);
      refreshed := refreshed + 1;
    end if;

    update public.counter_refresh_jobs
    set status = 'done', force_refresh = false, course_ids = null, completed_at = now()
    where user_id = job.user_id;
  end loop;

  return refreshed;
end;
$$;
