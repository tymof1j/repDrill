-- Count complete learned lines, missing cards, information chapters and puzzle attempts.
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
  natural_roots as (
    select m.*
    from chapter_moves m
    where not exists (
      select 1
      from chapter_moves previous
      where previous.chapter_id = m.chapter_id
        and previous.child_position_id = m.parent_position_id
    )
  ),
  roots as (
    select * from natural_roots
    union all
    select m.* from chapter_moves m
    where not exists (select 1 from natural_roots r where r.chapter_id = m.chapter_id)
      and m.parent_position_id = (
        select first_move.parent_position_id from public.moves first_move
        where first_move.chapter_id = m.chapter_id
        order by first_move.is_main_line desc, first_move.sort_order, first_move.id limit 1
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
    where (select count(*) from unnest(p.positions) pos where pos = p.position_id) = 1
  ),
  leaf_lines as (
    select p.*
    from paths p
    where (select count(*) from unnest(p.positions) pos where pos = p.position_id) > 1 or not exists (
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
      coalesce(bool_and(move.move_type <> 'repertoire' or (card.id is not null and (card.last_review is not null or card.state <> 0))), false) as learned,
      coalesce(bool_or(move.move_type = 'repertoire' and card.due <= now() and (card.last_review is not null or card.state <> 0)), false) as due,
      coalesce(bool_or(move.move_type = 'repertoire' and (card.id is null or (card.last_review is null and card.state = 0))), false) as is_new
    from leaf_lines line
    cross join lateral unnest(line.move_ids) as line_move(move_id)
    join chapter_moves move on move.id = line_move.move_id
    left join public.review_cards card
      on card.user_id = p_user_id
     and card.move_id = move.id
    group by line.course_id, line.chapter_id, line.line_key
  ),
  trainable_lines as (
    select status.*, c.training_mode,
      coalesce(puzzle.successes, 0) > 0 as solved
    from line_status status
    join public.chapters ch on ch.id = status.chapter_id
    join public.courses c on c.id = status.course_id
    left join public.puzzle_line_progress puzzle on puzzle.user_id = p_user_id
      and puzzle.chapter_id = status.chapter_id and puzzle.line_key = status.line_key
    left join public.chapter_line_settings setting
      on setting.chapter_id = status.chapter_id
     and setting.line_key = status.line_key
    where (status.has_repertoire or c.training_mode = 'puzzles')
      and not coalesce(setting.info_only, ch.chapter_type = 'info_only')
  ),
  course_totals as (
    select
      course_id,
      count(*)::integer as total_lines,
      count(*) filter (where (training_mode = 'theory' and learned) or (training_mode = 'puzzles' and solved))::integer as learned_lines,
      count(*) filter (where training_mode = 'theory' and due)::integer as due_lines,
      count(*) filter (where (training_mode = 'theory' and is_new) or (training_mode = 'puzzles' and not solved))::integer as new_lines
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
  from public.counter_snapshots snapshot
  join public.courses c on c.id = snapshot.course_id
  where snapshot.user_id = p_user_id and c.training_mode = 'theory';
end;
$$;


-- Rebuild existing cached totals on the next worker tick.
insert into public.counter_refresh_jobs (user_id, requested_at, status, force_refresh)
select id, now(), 'queued', true from public.users
on conflict (user_id) do update set requested_at = now(), status = 'queued', force_refresh = true;
