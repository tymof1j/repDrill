/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import { getSupabaseDb } from './server';
import type { BackendRow } from './types';
import { saveProgress } from '../training/saveProgress';
import { buildTrainingQueue } from '../training/queue';
import { importBundle } from '../import/bundle';
import { insertImportedChapter } from '../import/chapter';

type AppUser = { id: string; email: string | null; language?: string | null; [key: string]: unknown } | null;

function requireUser(user: AppUser) {
  if (!user) throw new Error('Unauthorized');
  return user;
}

async function assertShareOwner(db: any, userId: string, resourceType: string, resourceId: string) {
  const table = resourceType === 'course' ? 'courses' : resourceType === 'repertoire' ? 'repertoires' : resourceType === 'analysis' ? 'analyzed_games' : null;
  if (!table) throw new Error('Invalid share resource');
  const rows = table === 'courses'
    ? await db`select id from public.courses where id::text = ${resourceId} and user_id = ${userId} limit 1`
    : table === 'repertoires'
      ? await db`select id from public.repertoires where id::text = ${resourceId} and user_id = ${userId} limit 1`
      : await db`select id from public.analyzed_games where id::text = ${resourceId} and user_id = ${userId} limit 1`;
  if (!rows[0]) throw new Error('Not found');
}

function userRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    _creationTime: row.created_at instanceof Date ? row.created_at.getTime() : row.created_at,
    emailVerificationTime: row.email_verification_time instanceof Date ? row.email_verification_time.getTime() : row.email_verification_time,
    phoneVerificationTime: row.phone_verification_time instanceof Date ? row.phone_verification_time.getTime() : row.phone_verification_time,
    lichessUsername: row.lichess_username,
    chesscomUsername: row.chesscom_username,
    lastAnalyzeSyncLichessAt: row.last_analyze_sync_lichess_at,
    lastAnalyzeSyncChesscomAt: row.last_analyze_sync_chesscom_at,
  };
}

function courseRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    _creationTime: row.created_at instanceof Date ? row.created_at.getTime() : row.created_at,
    userId: row.user_id,
    trainingMode: row.training_mode,
    sourceCourseId: row.source_course_id,
    sourceUrl: row.source_url,
    isPublic: row.is_public,
    shareToken: row.share_token,
    lastChapterReorderAt: row.last_chapter_reorder_at,
    createdAt: row.created_at instanceof Date ? row.created_at.getTime() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.getTime() : row.updated_at,
  };
}

function analysisGameRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    gameId: row.game_id,
    whiteUsername: row.white_username,
    blackUsername: row.black_username,
    playedAt: dateMs(row.played_at),
    playedAs: row.played_as,
    deviationKind: row.deviation_kind,
    deviationMoveNumber: row.deviation_move_number,
    deviationPly: row.deviation_ply,
    playedSan: row.played_san,
    expectedSans: row.expected_sans,
    deviationFen: row.deviation_fen,
    totalPlies: row.total_plies,
  };
}

function chapterRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    _creationTime: row.created_at instanceof Date ? row.created_at.getTime() : row.created_at,
    courseId: row.course_id,
    chapterType: row.chapter_type,
    sortOrder: row.sort_order,
    sourceChapterId: row.source_chapter_id,
    sourceFile: row.source_file,
    createdAt: row.created_at instanceof Date ? row.created_at.getTime() : row.created_at,
  };
}

function positionRow(row: Record<string, unknown>) {
  return { ...row, _id: row.id, userId: row.user_id };
}

function moveRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    chapterId: row.chapter_id,
    parentPositionId: row.parent_position_id,
    childPositionId: row.child_position_id,
    moveNumber: row.move_number,
    colorToMove: row.color_to_move,
    isMainLine: row.is_main_line,
    moveType: row.move_type,
    sortOrder: row.sort_order,
  };
}

function repertoireRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    userId: row.user_id,
    createdAt: dateMs(row.created_at),
    updatedAt: dateMs(row.updated_at),
  };
}

function reviewCardRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    userId: row.user_id,
    moveId: row.move_id,
    lastReview: dateMs(row.last_review),
    due: dateMs(row.due),
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
  };
}

function reviewLogRow(row: Record<string, unknown>) {
  return {
    ...row,
    _id: row.id,
    cardId: row.card_id,
    responseTimeMs: row.response_time_ms,
    reviewedAt: dateMs(row.reviewed_at),
    prevStability: row.prev_stability,
    prevDifficulty: row.prev_difficulty,
    prevState: row.prev_state,
  };
}


async function loadRepertoireTree(db: any, repertoireId: string, userId: string) {
  const reps = await db`select * from public.repertoires where id = ${repertoireId} and user_id = ${userId} limit 1`;
  if (!reps[0]) return null;
  const junctions = await db`select * from public.repertoire_courses where repertoire_id = ${repertoireId} order by sort_order`;
  const courses: any[] = [];
  for (const junction of junctions) {
    const rows = await db`select * from public.courses where id = ${junction.course_id} limit 1`;
    if (rows[0]) courses.push({ junctionId: junction.id, sortOrder: junction.sort_order, course: courseRow(rows[0]) });
  }
  const courseIds = courses.map((entry) => entry.course._id);
  if (courseIds.length === 0) return { repertoire: repertoireRow(reps[0]), courses: [], chapters: [], moves: [], positions: [], choices: [] };
  const chapters = await db`select * from public.chapters where course_id in ${db(courseIds)} order by sort_order, created_at`;
  const chapterIds = chapters.map((chapter: any) => chapter.id);
  const moves = chapterIds.length ? await db`select * from public.moves where chapter_id in ${db(chapterIds)} order by sort_order` : [];
  const positionIds = [...new Set(moves.flatMap((move: any) => [move.parent_position_id, move.child_position_id]))];
  const positions = positionIds.length ? await db`select * from public.positions where id in ${db(positionIds)}` : [];
  const choices = await db`select * from public.repertoire_choices where repertoire_id = ${repertoireId}`;
  return {
    repertoire: repertoireRow(reps[0]),
    courses,
    chapters: chapters.map(chapterRow),
    moves: moves.map(moveRow),
    positions: positions.map(positionRow),
    choices: choices.map((choice: any) => ({ ...choice, _id: choice.id, repertoireId: choice.repertoire_id, positionId: choice.position_id, preferredMoveId: choice.preferred_move_id })),
  };
}

async function publicCourse(db: any, token: string) {
  let rows = await db`select c.*, null::text as link_access, null::text as link_scope_type, null::text as link_scope_id, null::text as link_scope_label from public.courses c where c.share_token = ${token} and c.is_public = true limit 1`;
  let link: any = null;
  if (!rows[0]) {
    const links = await db`select * from public.share_links where token = ${token} and access <> 'none' limit 1`;
    link = links[0];
    if (!link) return null;
    if (link.resource_type === 'course') rows = await db`select c.*, ${link.access}::text as link_access, ${link.scope_type}::text as link_scope_type, ${link.scope_id}::text as link_scope_id, ${link.scope_label}::text as link_scope_label from public.courses c where c.id::text = ${link.resource_id} limit 1`;
    if (link.resource_type === 'repertoire' && link.scope_type === 'course' && link.scope_id) rows = await db`select c.*, ${link.access}::text as link_access, ${link.scope_type}::text as link_scope_type, ${link.scope_id}::text as link_scope_id, ${link.scope_label}::text as link_scope_label from public.courses c join public.repertoire_courses rc on rc.course_id = c.id where c.id::text = ${link.scope_id} and rc.repertoire_id::text = ${link.resource_id} limit 1`;
  }
  if (!rows[0]) return null;
  const course = rows[0];
  const chapters = await db`select * from public.chapters where course_id = ${course.id} order by sort_order, created_at`;
  const scopeType = course.link_scope_type ?? 'resource';
  const scopeId = course.link_scope_id ?? null;
  return {
    course: courseRow(course),
    chapters: (scopeType === 'chapter' && scopeId ? chapters.filter((chapter: any) => String(chapter.id) === String(scopeId)) : chapters).map(chapterRow),
    access: course.link_access ?? 'copy',
    scopeType,
    scopeId,
    scopeLabel: course.link_scope_label ?? null,
  };
}

async function buildTrainingLines(db: any, user: AppUser, args: Record<string, unknown>) {
  const courses = await db`select c.* from public.courses c where c.user_id = ${user!.id}
    ${args.courseId ? db`and c.id = ${String(args.courseId)}` : db`and c.training_mode = 'theory'`}
    ${args.repertoireId ? db`and c.id in (select rc.course_id from public.repertoire_courses rc join public.repertoires r on r.id = rc.repertoire_id where r.id = ${String(args.repertoireId)} and r.user_id = ${user!.id})` : db``}
    order by c.created_at, c.id`;
  if (!courses.length) return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };
  const chapters = await db`select * from public.chapters where course_id in ${db(courses.map((course: any) => course.id))}
    ${args.chapterId ? db`and id = ${String(args.chapterId)}` : db``} order by sort_order, created_at, id`;
  if (!chapters.length) return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };
  const chapterIds = chapters.map((chapter: any) => chapter.id);
  const [moves, positions, cards, settings, views, puzzleProgress] = await Promise.all([
    db`select * from public.moves where chapter_id in ${db(chapterIds)} order by sort_order, id`,
    db`select p.id, p.fen, p.annotation from public.positions p where p.id in (
      select parent_position_id from public.moves where chapter_id in ${db(chapterIds)}
      union select child_position_id from public.moves where chapter_id in ${db(chapterIds)})`,
    db`select rc.* from public.review_cards rc join public.moves m on m.id = rc.move_id where rc.user_id = ${user!.id} and m.chapter_id in ${db(chapterIds)}`,
    db`select * from public.chapter_line_settings where chapter_id in ${db(chapterIds)}`,
    db`select chapter_id, line_key from public.info_line_views where user_id = ${user!.id} and chapter_id in ${db(chapterIds)}`,
    courses.some((course: any) => course.training_mode === 'puzzles') ? db`select * from public.puzzle_line_progress where user_id = ${user!.id} and chapter_id in ${db(chapterIds)}` : [],
  ]);
  return buildTrainingQueue({ courses, chapters, moves, positions, cards, settings, views, puzzleProgress }, args);
}



function dateMs(value: unknown) {
  return value instanceof Date ? value.getTime() : value;
}

async function courseTree(courseId: string, userId: string) {
  const db: any = getSupabaseDb();
  const courses = await db`select * from public.courses where id = ${courseId} and user_id = ${userId} limit 1`;
  if (!courses[0]) return null;
  const chapters = await db`select * from public.chapters where course_id = ${courseId} order by sort_order, created_at`;
  const moves = await db`
    select m.* from public.moves m
    join public.chapters ch on ch.id = m.chapter_id
    where ch.course_id = ${courseId}
    order by m.sort_order
  `;
  const positions: BackendRow[] = await db`
    select distinct p.* from public.positions p
    join public.moves m on p.id = m.parent_position_id or p.id = m.child_position_id
    join public.chapters ch on ch.id = m.chapter_id
    where ch.course_id = ${courseId}
  `;
  const mappedMoves: BackendRow[] = moves.map((move: BackendRow) => moveRow(move) as unknown as BackendRow);
  const mappedPositions: BackendRow[] = positions.map((position: BackendRow) => positionRow(position) as unknown as BackendRow);
  const root = mappedPositions.find((position: any) => position.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -')
    ?? mappedPositions.find((position: any) => !mappedMoves.some((move: any) => move.childPositionId === position._id));
  return {
    course: courseRow(courses[0]),
    chapters: chapters.map(chapterRow),
    moves: mappedMoves,
    positions: mappedPositions,
    rootPositionId: root?._id ?? null,
  };
}

export async function executeSupabaseOperation(operation: string, args: Record<string, unknown>, appUser: AppUser): Promise<any> {
  const db: any = getSupabaseDb();
  if (operation === 'courses.getPublicByToken') return publicCourse(db, String(args.token));
  if (operation === 'courses.getPublicChapterTree') {
    const data = await publicCourse(db, String(args.token));
    if (!data) return null;
    const chapter = data.chapters.find((row: any) => String(row._id) === String(args.chapterId));
    if (!chapter) return null;
    const moves = await db`select * from public.moves where chapter_id = ${chapter._id} order by sort_order`;
    const ids = [...new Set(moves.flatMap((move: any) => [move.parent_position_id, move.child_position_id]))];
    const positions = ids.length ? await db`select * from public.positions where id in ${db(ids)}` : [];
    return { moves: moves.map(moveRow), positions: positions.map(positionRow) };
  }
  if (operation === 'repertoires.getPublicByToken') {
    const links = await db`select * from public.share_links where token = ${String(args.token)} and resource_type = 'repertoire' and access <> 'none' limit 1`;
    if (!links[0]) return null;
    const reps = await db`select * from public.repertoires where id::text = ${links[0].resource_id} limit 1`;
    if (!reps[0]) return null;
    const tree = await loadRepertoireTree(db, reps[0].id, reps[0].user_id);
    return tree ? { ...tree, access: links[0].access, scopeType: links[0].scope_type ?? 'resource', scopeId: links[0].scope_id } : null;
  }
  if (operation === 'analyze.getPublicByToken') {
    const links = await db`select * from public.share_links where token = ${String(args.token)} and resource_type = 'analysis' and access <> 'none' limit 1`;
    if (!links[0]) return null;
    const rows = await db`select * from public.analyzed_games where id::text = ${links[0].resource_id} limit 1`;
    return rows[0] ? { game: { ...rows[0], _id: rows[0].id, playedAt: dateMs(rows[0].played_at), whiteUsername: rows[0].white_username, blackUsername: rows[0].black_username, gameId: rows[0].game_id, timeControl: rows[0].time_control, playedAs: rows[0].played_as, deviationKind: rows[0].deviation_kind, deviationMoveNumber: rows[0].deviation_move_number, deviationPly: rows[0].deviation_ply, playedSan: rows[0].played_san, expectedSans: rows[0].expected_sans, deviationFen: rows[0].deviation_fen, totalPlies: rows[0].total_plies, deviationPositionId: rows[0].deviation_position_id }, access: links[0].access } : null;
  }
  const user = requireUser(appUser);

  if (operation === 'users.current') return userRow(user);
  if (operation === 'users.updateLanguage') {
    await db`update public.users set language = ${args.language}, updated_at = now() where id = ${user.id}`;
    return null;
  }
  if (operation === 'users.updateAccounts') {
    await db`update public.users set lichess_username = ${args.lichessUsername || null}, chesscom_username = ${args.chesscomUsername || null}, updated_at = now() where id = ${user.id}`;
    return null;
  }

  if (operation === 'courses.create') {
    const rows = await db`
      insert into public.courses (user_id, name, color, description)
      values (${user.id}, ${String(args.name)}, ${String(args.color)}, ${args.description ? String(args.description) : null})
      returning id
    `;
    return rows[0].id;
  }

  if (operation === 'courses.list') {
    const rows = await db`select * from public.courses where user_id = ${user.id} order by created_at`;
    return rows.map(courseRow);
  }
  if (operation === 'courses.get') {
    const rows = await db`select * from public.courses where id = ${String(args.id)} and user_id = ${user.id} limit 1`;
    return rows[0] ? courseRow(rows[0]) : null;
  }
  if (operation === 'courses.listChapters') {
    const rows = await db`
      select ch.* from public.chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.course_id = ${String(args.courseId)} and c.user_id = ${user.id}
      order by ch.sort_order, ch.created_at
    `;
    return rows.map(chapterRow);
  }
  if (operation === 'courses.getTree') return courseTree(String(args.courseId), user.id);
  if (operation === 'courses.getChapterTree') {
    const chapters = await db`
      select ch.* from public.chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.id = ${String(args.chapterId)} and c.user_id = ${user.id}
      limit 1
    `;
    if (!chapters[0]) return null;
    const moves = await db`select * from public.moves where chapter_id = ${String(args.chapterId)} order by sort_order`;
    const positions: BackendRow[] = await db`
      select distinct p.* from public.positions p
      join public.moves m on p.id = m.parent_position_id or p.id = m.child_position_id
      where m.chapter_id = ${String(args.chapterId)}
    `;
    return { moves: moves.map(moveRow), positions: positions.map(positionRow) };
  }

  if (operation === 'courses.ensureImported') return null;
  if (operation === 'courses.remove') {
    const rows = await db`delete from public.courses where id = ${String(args.id)} and user_id = ${user.id} returning id`;
    if (!rows[0]) throw new Error('Not found');
    return null;
  }
  if (operation === 'courses.setTrainingMode') {
    if (!['theory', 'puzzles'].includes(String(args.mode))) throw new Error('Invalid training mode');
    await db.begin(async (tx: any) => {
      const rows = await tx`update public.courses set training_mode = ${args.mode}, updated_at = now() where id = ${String(args.courseId)} and user_id = ${user.id} returning id`;
      if (!rows[0]) throw new Error('Course not found');
      await tx`insert into public.counter_refresh_jobs (user_id, requested_at, status, force_refresh) values (${user.id}, now(), 'queued', true) on conflict (user_id) do update set requested_at = now(), status = 'queued', force_refresh = true`;
    });
    return null;
  }
  if (operation === 'courses.rename') {
    await db`update public.courses set name = ${String(args.name)}, updated_at = now() where id = ${String(args.id)} and user_id = ${user.id}`;
    return null;
  }
  if (operation === 'courses.renameChapter') {
    await db`
      update public.chapters ch set name = ${String(args.name)}
      from public.courses c
      where ch.id = ${String(args.id)} and ch.course_id = c.id and c.user_id = ${user.id}
    `;
    return null;
  }
  if (operation === 'courses.reorderChapters') {
    const courseId = String(args.courseId);
    const ids = Array.isArray(args.chapterIds) ? args.chapterIds.map(String) : [];
    const owned = await db`select 1 from public.courses where id = ${courseId} and user_id = ${user.id}`;
    if (!owned[0]) throw new Error('Not found');
    for (const [index, chapterId] of ids.entries()) {
      await db`update public.chapters set sort_order = ${index} where id = ${chapterId} and course_id = ${courseId}`;
    }
    await db`update public.courses set last_chapter_reorder_at = now(), updated_at = now() where id = ${courseId}`;
    return null;
  }
  if (operation === 'courses.deleteChapter') {
    const chapterId = String(args.id);
    await db.begin(async (tx: any) => {
      const owned = await tx`
        select ch.id from public.chapters ch join public.courses c on c.id = ch.course_id
        where ch.id = ${chapterId} and c.user_id = ${user.id}
      `;
      if (!owned[0]) throw new Error('Not found');
      // Atomic: a failure between the two deletes must not orphan moves.
      await tx`delete from public.moves where chapter_id = ${chapterId}`;
      await tx`delete from public.chapters where id = ${chapterId}`;
    });
    return null;
  }
  if (operation === 'courses.setLineInfoOnly') {
    const chapterId = String(args.chapterId);
    const owned = await db`
      select ch.id from public.chapters ch join public.courses c on c.id = ch.course_id
      where ch.id = ${chapterId} and c.user_id = ${user.id}
    `;
    if (!owned[0]) throw new Error('Not found');
    await db`
      insert into public.chapter_line_settings (chapter_id, line_key, info_only)
      values (${chapterId}, ${String(args.lineKey)}, ${Boolean(args.infoOnly)})
      on conflict (chapter_id, line_key) do update set info_only = excluded.info_only, updated_at = now()
    `;
    return null;
  }
  if (operation === 'courses.setSharing') {
    const courseId = String(args.courseId);
    const courses = await db`select * from public.courses where id = ${courseId} and user_id = ${user.id} limit 1`;
    if (!courses[0]) throw new Error('Not found');
    const intent = String(args.intent);
    const isPublic = intent === 'disable' ? false : true;
    const token = intent === 'disable' ? null : (intent === 'enable' && courses[0].share_token ? courses[0].share_token : crypto.randomUUID().replaceAll('-', '').slice(0, 16));
    await db`update public.courses set is_public = ${isPublic}, share_token = ${token}, updated_at = now() where id = ${courseId}`;
    return { token: isPublic ? token : null, isPublic };
  }
  if (operation === 'courses.updateAnnotation') {
    const positionId = String(args.positionId);
    const owned = await db`select 1 from public.positions where id = ${positionId} and user_id = ${user.id}`;
    if (!owned[0]) throw new Error('Not found');
    await db`update public.positions set annotation = ${String(args.text ?? '') || null} where id = ${positionId}`;
    return null;
  }

  if (operation === 'repertoires.list') {
    const rows: BackendRow[] = await db`select * from public.repertoires where user_id = ${user.id} order by created_at`;
    return rows.map((row: BackendRow) => repertoireRow(row));
  }

  if (operation === 'repertoires.get') {
    const rows = await db`select * from public.repertoires where id = ${String(args.id)} and user_id = ${user.id} limit 1`;
    return rows[0] ? repertoireRow(rows[0]) : null;
  }
  if (operation === 'repertoires.create') {
    const rows = await db`insert into public.repertoires (user_id, name, description) values (${user.id}, ${String(args.name)}, ${args.description ? String(args.description) : null}) returning id`;
    return rows[0].id;
  }
  if (operation === 'repertoires.remove') {
    const rows = await db`delete from public.repertoires where id = ${String(args.id)} and user_id = ${user.id} returning id`;
    if (!rows[0]) throw new Error('Not found');
    return null;
  }
  if (operation === 'repertoires.rename') {
    await db`update public.repertoires set name = ${String(args.name)}, updated_at = now() where id = ${String(args.id)} and user_id = ${user.id}`;
    return null;
  }
  if (operation === 'repertoires.addCourse') {
    const rep = await db`select id from public.repertoires where id = ${String(args.repertoireId)} and user_id = ${user.id}`;
    const course = await db`select id from public.courses where id = ${String(args.courseId)} and user_id = ${user.id}`;
    if (!rep[0] || !course[0]) throw new Error('Not found');
    const orderRows = await db`select coalesce(max(sort_order), -1) + 1 as next_order from public.repertoire_courses where repertoire_id = ${String(args.repertoireId)}`;
    await db`insert into public.repertoire_courses (repertoire_id, course_id, sort_order) values (${String(args.repertoireId)}, ${String(args.courseId)}, ${orderRows[0].next_order}) on conflict do nothing`;
    return null;
  }
  if (operation === 'repertoires.removeCourse') {
    await db`delete from public.repertoire_courses where repertoire_id = ${String(args.repertoireId)} and course_id = ${String(args.courseId)} and repertoire_id in (select id from public.repertoires where user_id = ${user.id})`;
    return null;
  }
  if (operation === 'repertoires.setChoice') {
    const owned = await db`select id from public.repertoires where id = ${String(args.repertoireId)} and user_id = ${user.id} limit 1`;
    if (!owned[0]) throw new Error('Not found');
    const validMove = await db`
      select m.id from public.moves m
      join public.chapters ch on ch.id = m.chapter_id
      join public.repertoire_courses rc on rc.course_id = ch.course_id
      where rc.repertoire_id = ${String(args.repertoireId)} and m.id = ${String(args.moveId)}
        and (${String(args.positionId)} = m.parent_position_id::text or ${String(args.positionId)} = m.child_position_id::text)
      limit 1
    `;
    if (!validMove[0]) throw new Error('Move is not part of this repertoire');
    await db`
      insert into public.repertoire_choices (repertoire_id, position_id, preferred_move_id)
      values (${String(args.repertoireId)}, ${String(args.positionId)}, ${String(args.moveId)})
      on conflict (repertoire_id, position_id) do update set preferred_move_id = excluded.preferred_move_id
    `;
    return null;
  }
  if (operation === 'repertoires.clearChoice') {
    const owned = await db`select id from public.repertoires where id = ${String(args.repertoireId)} and user_id = ${user.id} limit 1`;
    if (!owned[0]) throw new Error('Not found');
    await db`delete from public.repertoire_choices where repertoire_id = ${String(args.repertoireId)} and position_id = ${String(args.positionId)}`;
    return null;
  }
  if (operation === 'repertoires.listCourses') {
    const rows = await db`
      select c.*, rc.id as junction_id, rc.sort_order as junction_sort_order
      from public.repertoire_courses rc join public.courses c on c.id = rc.course_id
      where rc.repertoire_id = ${String(args.repertoireId)}
      order by rc.sort_order
    `;
    return rows.map((row: BackendRow) => ({ junctionId: row.junction_id, sortOrder: row.junction_sort_order, course: courseRow(row) }));
  }
  if (operation === 'repertoires.loadTree') return loadRepertoireTree(db, String(args.repertoireId), user.id);

  if (operation === 'sharing.getSettings') {
    const resourceType = String(args.resourceType);
    const resourceId = String(args.resourceId);
    const scopeType = String(args.scopeType ?? 'resource');
    const scopeId = args.scopeId ? String(args.scopeId) : null;
    const links = await db`
      select sl.*, u.name as owner_name, u.email as owner_email
      from public.share_links sl join public.users u on u.id = sl.owner_id
      where sl.owner_id = ${user.id} and sl.resource_type = ${resourceType} and sl.resource_id = ${resourceId}
        and coalesce(sl.scope_type, 'resource') = ${scopeType} and coalesce(sl.scope_id, '') = coalesce(${scopeId}, '')
      limit 1
    `;
    const link = links[0];
    const invitations = await db`
      select id, email, access, notify from public.share_invitations
      where owner_id = ${user.id} and resource_type = ${resourceType} and resource_id = ${resourceId}
        and coalesce(scope_type, 'resource') = ${scopeType} and coalesce(scope_id, '') = coalesce(${scopeId}, '')
      order by created_at
    `;
    return {
      linkAccess: link?.access ?? 'none',
      token: link?.token ?? null,
      ownerName: link?.owner_name ?? null,
      ownerEmail: link?.owner_email ?? user.email,
      invitations,
    };
  }
  if (operation === 'sharing.setLinkAccess' || operation === 'sharing.rotateLink') {
    const resourceType = String(args.resourceType);
    const resourceId = String(args.resourceId);
    const scopeType = String(args.scopeType ?? 'resource');
    const scopeId = args.scopeId ? String(args.scopeId) : null;
    const scopeLabel = args.scopeLabel ? String(args.scopeLabel) : null;
    const access = operation === 'sharing.rotateLink' ? 'copy' : String(args.access);
    await assertShareOwner(db, user.id, resourceType, resourceId);
    const token = crypto.randomUUID().replaceAll('-', '').slice(0, 20);
    const existing = await db`
      select id from public.share_links
      where owner_id = ${user.id} and resource_type = ${resourceType} and resource_id = ${resourceId}
        and scope_type is not distinct from ${scopeType} and scope_id is not distinct from ${scopeId}
      limit 1
    `;
    const links = existing[0]
      ? await db`update public.share_links set token = ${token}, access = ${access}, scope_label = ${scopeLabel}, updated_at = now() where id = ${existing[0].id} returning *`
      : await db`insert into public.share_links (owner_id, resource_type, resource_id, scope_type, scope_id, scope_label, token, access) values (${user.id}, ${resourceType}, ${resourceId}, ${scopeType}, ${scopeId}, ${scopeLabel}, ${token}, ${access}) returning *`;
    return { access: links[0].access, token: links[0].token };
  }
  if (operation === 'sharing.upsertInvitation') {
    const resourceType = String(args.resourceType);
    const resourceId = String(args.resourceId);
    const scopeType = String(args.scopeType ?? 'resource');
    const scopeId = args.scopeId ? String(args.scopeId) : null;
    await assertShareOwner(db, user.id, resourceType, resourceId);
    const existing = await db`
      select id from public.share_invitations where owner_id = ${user.id} and resource_type = ${resourceType} and resource_id = ${resourceId}
        and coalesce(scope_type, 'resource') = ${scopeType} and coalesce(scope_id, '') = coalesce(${scopeId}, '') and lower(email) = lower(${String(args.email)}) limit 1
    `;
    if (existing[0]) {
      await db`update public.share_invitations set access = ${String(args.access)}, notify = ${args.notify !== false}, message = ${args.message ? String(args.message) : null}, updated_at = now() where id = ${existing[0].id}`;
    } else {
      await db`insert into public.share_invitations (owner_id, resource_type, resource_id, scope_type, scope_id, scope_label, email, access, notify, message) values (${user.id}, ${resourceType}, ${resourceId}, ${scopeType}, ${scopeId}, ${args.scopeLabel ? String(args.scopeLabel) : null}, ${String(args.email).toLowerCase()}, ${String(args.access)}, ${args.notify !== false}, ${args.message ? String(args.message) : null})`;
    }
    const titleRows = resourceType === 'course'
      ? await db`select name as title from public.courses where id::text = ${resourceId} limit 1`
      : resourceType === 'repertoire'
        ? await db`select name as title from public.repertoires where id::text = ${resourceId} limit 1`
        : await db`select coalesce(opening, game_id) as title from public.analyzed_games where id::text = ${resourceId} limit 1`;
    return { title: titleRows[0]?.title ?? 'RepDrill item' };
  }
  if (operation === 'sharing.removeInvitation') {
    await assertShareOwner(db, user.id, String(args.resourceType), String(args.resourceId));
    await db`delete from public.share_invitations where owner_id = ${user.id} and resource_type = ${String(args.resourceType)} and resource_id = ${String(args.resourceId)} and lower(email) = lower(${String(args.email)}) and coalesce(scope_type, 'resource') = ${String(args.scopeType ?? 'resource')} and coalesce(scope_id, '') = coalesce(${args.scopeId ? String(args.scopeId) : null}, '')`;
    return null;
  }
  if (operation === 'sharing.transferOwnership') {
    const target = String(args.email).toLowerCase();
    const resourceType = String(args.resourceType);
    const resourceId = String(args.resourceId);
    await assertShareOwner(db, user.id, resourceType, resourceId);
    const newOwner = await db`select id from public.users where lower(email) = ${target} limit 1`;
    if (!newOwner[0]) throw new Error('Invite the user before transferring ownership');
    if (resourceType === 'course') await db`update public.courses set user_id = ${newOwner[0].id}, updated_at = now() where id = ${resourceId} and user_id = ${user.id}`;
    if (resourceType === 'repertoire') await db`update public.repertoires set user_id = ${newOwner[0].id}, updated_at = now() where id = ${resourceId} and user_id = ${user.id}`;
    if (resourceType === 'analysis') await db`update public.analyzed_games set user_id = ${newOwner[0].id} where id = ${resourceId} and user_id = ${user.id}`;
    await db`update public.share_links set owner_id = ${newOwner[0].id} where owner_id = ${user.id} and resource_type = ${resourceType} and resource_id = ${resourceId}`;
    await db`update public.share_invitations set owner_id = ${newOwner[0].id} where owner_id = ${user.id} and resource_type = ${resourceType} and resource_id = ${resourceId}`;
    return null;
  }
  if (operation === 'sharing.listSharedWithMe') return [];
  if (operation === 'sharing.resolveToken') {
    const course = await publicCourse(db, String(args.token));
    return course;
  }
  if (operation === 'sharing.listMySharedAnalysis') {
    const rows = await db`
      select distinct ag.* from public.share_links sl
      join public.analyzed_games ag on ag.id::text = sl.resource_id
      where sl.resource_type = 'analysis' and sl.owner_id = ${user.id}
    `;
    return rows.map((row: BackendRow) => ({ resource: analysisGameRow(row) }));
  }
  if (operation === 'sharing.listSharedAnalysis') {
    const rows = await db`
      select distinct ag.*, owner.name as owner_name, owner.email as owner_email
      from public.share_invitations si
      join public.users recipient on lower(recipient.email) = lower(si.email)
      join public.analyzed_games ag on ag.id::text = si.resource_id
      join public.users owner on owner.id = si.owner_id
      where recipient.id = ${user.id} and si.owner_id <> ${user.id} and si.resource_type = 'analysis'
    `;
    return rows.map((row: BackendRow) => ({ resource: analysisGameRow(row) }));
  }

  if (operation === 'bookProgress.getBookProgress') {
    const rows = await db`select * from public.book_progress where user_id = ${user.id} and book_key = ${String(args.bookKey)} limit 1`;
    if (!rows[0]) return null;
    return { ...rows[0], _id: rows[0].id, bookKey: rows[0].book_key, solved: (await db`select puzzle from public.book_puzzle_progress where user_id = ${user.id} and book_key = ${String(args.bookKey)} and cycle = ${rows[0].cycle} and solved = true order by puzzle`).map((row: any) => row.puzzle), missed: (await db`select puzzle from public.book_puzzle_progress where user_id = ${user.id} and book_key = ${String(args.bookKey)} and cycle = ${rows[0].cycle} and missed = true order by puzzle`).map((row: any) => row.puzzle), startedAt: dateMs(rows[0].started_at), updatedAt: dateMs(rows[0].updated_at), solvedCount: rows[0].solved_count, missedCount: rows[0].missed_count, unresolvedMissedCount: rows[0].unresolved_missed_count, attemptCount: rows[0].attempt_count };
  }
  if (operation === 'bookProgress.recordAttempt') {
    const bookKey = String(args.bookKey);
    const puzzle = Number(args.puzzle);
    const success = Boolean(args.success);
    const now = new Date();
    // Serialize concurrent attempts (e.g. two tabs) per user+book: the
    // read-modify-write below loses counter updates without a lock, and the
    // summary insert can otherwise race into duplicate rows.
    await db.begin(async (tx: any) => {
      await tx`select pg_advisory_xact_lock(hashtext(${`${user.id}:${bookKey}`}))`;
      let summaries = await tx`select * from public.book_progress where user_id = ${user.id} and book_key = ${bookKey} limit 1`;
      if (!summaries[0]) {
        const setSize = bookKey === 'woodpecker-method' ? 1128 : 1000;
        summaries = await tx`insert into public.book_progress (user_id, book_key, cycle, position, set_size, started_at) values (${user.id}, ${bookKey}, 1, 1, ${setSize}, null) returning *`;
      }
      const summary = summaries[0];
      if (puzzle < 1 || puzzle > summary.set_size) throw new Error('Puzzle is outside the current set');
      const sourceAttemptKey = `native:${String(args.attemptId ?? crypto.randomUUID())}`;
      if (args.attemptId) {
        const duplicate = await tx`select id from public.book_puzzle_attempts where user_id = ${user.id} and book_key = ${bookKey} and source_attempt_key = ${sourceAttemptKey} limit 1`;
        if (duplicate[0]) return;
      }
      const states = await tx`select * from public.book_puzzle_progress where user_id = ${user.id} and book_key = ${bookKey} and cycle = ${summary.cycle} and puzzle = ${puzzle} limit 1`;
      const state = states[0];
      const attempt = Number(state?.attempt_count ?? 0) + 1;
      await tx`insert into public.book_puzzle_attempts (user_id, book_key, cycle, puzzle, attempt, success, duration_ms, recorded_at, source, source_marker, source_attempt_key) values (${user.id}, ${bookKey}, ${summary.cycle}, ${puzzle}, ${attempt}, ${success}, ${args.durationMs == null ? null : Math.round(Number(args.durationMs))}, ${now}, 'native', 'native', ${sourceAttemptKey})`;
      const solved = Boolean(state?.solved) || success;
      const missed = solved ? false : Boolean(state?.missed) || !success;
      if (state) await tx`update public.book_puzzle_progress set solved = ${solved}, missed = ${missed}, attempt_count = ${attempt}, last_time_ms = ${args.durationMs == null ? null : Math.round(Number(args.durationMs))}, last_success = ${success}, last_attempt_at = ${now}, updated_at = now() where id = ${state.id}`;
      else await tx`insert into public.book_puzzle_progress (user_id, book_key, cycle, puzzle, solved, missed, attempt_count, last_time_ms, last_success, last_attempt_at, source_marker) values (${user.id}, ${bookKey}, ${summary.cycle}, ${puzzle}, ${solved}, ${missed}, ${attempt}, ${args.durationMs == null ? null : Math.round(Number(args.durationMs))}, ${success}, ${now}, 'native')`;
      const solvedCount = Number(summary.solved_count) + (!state?.solved && solved ? 1 : 0);
      const missedCount = Math.max(0, Number(summary.missed_count) + (!state?.missed && missed ? 1 : 0) - (state?.missed && solved ? 1 : 0));
      await tx`update public.book_progress set position = ${success ? Math.max(Number(summary.position), Math.min(Number(summary.set_size) + 1, puzzle + 1)) : Math.max(Number(summary.position), puzzle)}, solved_count = ${solvedCount}, missed_count = ${missedCount}, attempt_count = ${Number(summary.attempt_count) + 1}, started_at = coalesce(started_at, ${now}), updated_at = now() where id = ${summary.id}`;
    });
    return executeSupabaseOperation('bookProgress.getBookProgress', args, user);
  }
  if (operation === 'bookProgress.advanceCycle') {
    const rows = await db`update public.book_progress set cycle = least(cycle + 1, 7), position = 1, solved_count = 0, missed_count = 0, unresolved_missed_count = 0, started_at = null, updated_at = now() where user_id = ${user.id} and book_key = ${String(args.bookKey)} ${args.expectedCycle == null ? db`` : db`and cycle = ${Number(args.expectedCycle)}`} returning *`;
    if (!rows[0]) throw new Error('Book progress has not been started');
    return executeSupabaseOperation('bookProgress.getBookProgress', args, user);
  }
  if (operation === 'bookProgress.migrateLocalProgress') {
    const progress: any = args.progress;
    const bookKey = String(args.bookKey);
    const prior = await db`select id from public.book_progress_imports where user_id = ${user.id} and book_key = ${bookKey} and source_marker = 'local_storage' limit 1`;
    if (prior[0]) return { status: 'already_imported', importId: prior[0].id, snapshot: await executeSupabaseOperation('bookProgress.getBookProgress', args, user) };
    const existing = await db`select id from public.book_progress where user_id = ${user.id} and book_key = ${bookKey} limit 1`;
    if (existing[0]) return { status: 'server_state_preserved', importId: null, snapshot: await executeSupabaseOperation('bookProgress.getBookProgress', args, user) };
    await db`insert into public.book_progress (user_id, book_key, cycle, position, set_size, solved_count, missed_count, unresolved_missed_count, started_at, source_marker, last_imported_at) values (${user.id}, ${bookKey}, ${progress.cycle}, ${progress.position}, ${progress.setSize}, ${progress.solved.length}, ${progress.missed.length}, 0, ${progress.startedAt ?? null}, 'local_storage', now()) returning id`;
    for (const puzzle of [...(progress.solved ?? []), ...(progress.missed ?? [])]) await db`insert into public.book_puzzle_progress (user_id, book_key, cycle, puzzle, solved, missed, last_success, last_attempt_at, source_marker) values (${user.id}, ${bookKey}, ${progress.cycle}, ${puzzle}, ${progress.solved.includes(puzzle)}, ${progress.missed.includes(puzzle)}, ${progress.solved.includes(puzzle)}, now(), 'local_storage') on conflict do nothing`;
    const imports = await db`insert into public.book_progress_imports (user_id, book_key, kind, source_marker, idempotency_key, source_record_count, imported_attempt_count, cycle, position, set_size, solved_count, missed_count, completed_at) values (${user.id}, ${bookKey}, 'local_storage', 'local_storage', ${String(args.idempotencyKey)}, ${(progress.solved ?? []).length + (progress.missed ?? []).length}, 0, ${progress.cycle}, ${progress.position}, ${progress.setSize}, ${progress.solved.length}, ${progress.missed.length}, now()) returning id`;
    return { status: 'imported', importId: imports[0].id, snapshot: await executeSupabaseOperation('bookProgress.getBookProgress', args, user) };
  }
  if (operation === 'bookProgress.importLegacyWoodpecker') {
    const payload: any = args;
    const progress = payload.progress;
    const existing = await db`select id from public.book_progress where user_id = ${user.id} and book_key = 'woodpecker-method' limit 1`;
    if (existing[0]) throw new Error('Book progress already contains server attempts and cannot be overwritten');
    const summary = await db`insert into public.book_progress (user_id, book_key, cycle, position, set_size, solved_count, missed_count, started_at, source_marker, last_imported_at) values (${user.id}, 'woodpecker-method', ${progress.cycle}, ${progress.position}, ${progress.setSize}, ${progress.solved.length}, ${progress.missedCount}, ${progress.startedAt ?? null}, ${payload.sourceMarker ?? 'legacy_csv'}, now()) returning id`;
    for (const row of payload.attempts ?? []) await db`insert into public.book_puzzle_attempts (user_id, book_key, cycle, puzzle, attempt, success, duration_ms, recorded_at, source, source_marker, source_attempt_key, import_id) values (${user.id}, 'woodpecker-method', ${row.cycle}, ${row.puzzle}, ${row.attempt}, ${row.success}, ${Math.round(Number(row.durationSeconds) * 1000)}, now(), 'legacy_import', ${payload.sourceMarker}, ${`${payload.sourceMarker}:${row.sourceRowKey}`}, ${summary[0].id}) on conflict do nothing`;
    const imports = await db`insert into public.book_progress_imports (user_id, book_key, kind, source_marker, idempotency_key, source_record_count, imported_attempt_count, cycle, position, set_size, solved_count, missed_count, completed_at) values (${user.id}, 'woodpecker-method', 'legacy_csv', ${payload.sourceMarker}, ${payload.idempotencyKey}, ${(payload.attempts ?? []).length}, ${(payload.attempts ?? []).length}, ${progress.cycle}, ${progress.position}, ${progress.setSize}, ${progress.solved.length}, ${progress.missedCount}, now()) returning id`;
    return { status: 'imported', importId: imports[0].id, insertedAttempts: (payload.attempts ?? []).length, insertedPuzzleProgress: 0, snapshot: await executeSupabaseOperation('bookProgress.getBookProgress', args, user) };
  }

  if (operation === 'sharing.listSharedCourses') {
    const invitations: BackendRow[] = await db`
      select si.id as invitation_id, si.access as invitation_access, si.resource_id, si.scope_id, si.scope_type, si.email as invitation_email,
             c.*, owner.name as owner_name, owner.email as owner_email
      from public.share_invitations si
      join public.users recipient on lower(recipient.email) = lower(si.email)
      join public.courses c on c.id::text = case when si.resource_type = 'course' then si.resource_id else si.scope_id end
      join public.users owner on owner.id = si.owner_id
      where recipient.id = ${user.id} and si.owner_id <> ${user.id}
        and ((si.resource_type = 'course') or (si.resource_type = 'repertoire' and si.scope_type = 'course'))
    `;
    return invitations.map((row: BackendRow) => ({
      invitation: { _id: row.invitation_id, access: row.invitation_access },
      owner: { name: row.owner_name, email: row.owner_email },
      resource: courseRow(row),
    }));
  }
  if (operation === 'sharing.listSharedRepertoires') {
    const rows: BackendRow[] = await db`
      select si.id as invitation_id, si.access as invitation_access, si.resource_id,
             r.*, owner.name as owner_name, owner.email as owner_email
      from public.share_invitations si
      join public.users recipient on lower(recipient.email) = lower(si.email)
      join public.repertoires r on r.id::text = si.resource_id
      join public.users owner on owner.id = si.owner_id
      where recipient.id = ${user.id} and si.owner_id <> ${user.id}
        and si.resource_type = 'repertoire' and (si.scope_type is null or si.scope_type = 'resource')
    `;
    return rows.map((row: BackendRow) => ({
      invitation: { _id: row.invitation_id, access: row.invitation_access },
      owner: { name: row.owner_name, email: row.owner_email },
      resource: repertoireRow(row),
    }));
  }

  if (operation === 'training.ensureCards' || operation === 'training.getTrainingLines') {
    const result = await db`
      insert into public.review_cards (user_id, move_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state)
      select ${user.id}, m.id, now(), 0, 0, 0, 0, 0, 0, 0
      from public.moves m join public.chapters ch on ch.id = m.chapter_id join public.courses c on c.id = ch.course_id
      where c.user_id = ${user.id} and c.training_mode = 'theory' and m.move_type = 'repertoire'
        ${args.courseId ? db`and c.id = ${String(args.courseId)}` : db``}
        ${args.chapterId ? db`and ch.id = ${String(args.chapterId)}` : db``}
        and not exists (select 1 from public.review_cards rc where rc.user_id = ${user.id} and rc.move_id = m.id)
      on conflict (user_id, move_id) do nothing returning id
    `;
    return operation === 'training.ensureCards' ? result.length : buildTrainingLines(db, user, args);
  }
  if (operation === 'training.getCourseLineStatuses') {
    const result = await buildTrainingLines(db, user, { ...args, learnMode: true });
    return result.lines.map((line: any) => ({
      chapterId: line.chapterId,
      lineIndex: line.chapterLineIndex,
      lineKey: line.lineKey,
      grade: line.isNew ? 'N' : line.dueCount > 0 ? 'D' : 'A',
      category: line.isInfoOnly ? 'info' : line.trainingMode === 'puzzles' ? (line.puzzleSolved ? 'mastered' : 'new') : line.isNew ? 'new' : line.dueCount > 0 ? 'due' : 'mastered',
      nextReviewAt: Number.isFinite(line.nextReviewAt) ? line.nextReviewAt : null,
      isInfoOnly: line.isInfoOnly,
    }));
  }
  if (operation === 'training.syncProgress') return saveProgress(db, user.id, args.events);
  if (operation === 'training.submitLineRatings') {
    const results = Array.isArray(args.results) ? args.results : [];
    if (!results.length) return null;
    return saveProgress(db, user.id, results.map((item: any) => ({
      id: item.eventId ?? crypto.randomUUID(), kind: 'review', cardId: item.cardId,
      correct: item.correct, responseTimeMs: Math.round(Math.max(0, Number(item.responseTimeMs) || 0)),
      reviewedAt: item.reviewedAt ?? Date.now(),
    })));
  }
  if (operation === 'training.markInfoLineViewed') {
    const accessible = await db`
      select ch.id from public.chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.id = ${String(args.chapterId)} and c.user_id = ${user.id}
      limit 1
    `;
    if (!accessible[0]) throw new Error('Not found');
    await db`
      insert into public.info_line_views (user_id, chapter_id, line_key, viewed_at)
      values (${user.id}, ${String(args.chapterId)}, ${String(args.lineKey)}, now())
      on conflict (user_id, chapter_id, line_key) do update set viewed_at = now()
    `;
    return null;
  }
  if (operation === 'training.getTrainingStats') {
    const rows = await db`select count(*)::int as total_cards, count(*) filter (where due <= now())::int as due_now from public.review_cards where user_id = ${user.id}`;
    return { totalCards: rows[0]?.total_cards ?? 0, dueNow: rows[0]?.due_now ?? 0, newCards: 0, learningCards: 0, reviewCards: rows[0]?.total_cards ?? 0 };
  }
  if (operation === 'training.exportReviewData') {
    const cards = await db`select * from public.review_cards where user_id = ${user.id} order by id`;
    const cardIds = cards.map((card: any) => card.id);
    const logs = cardIds.length ? await db`select * from public.review_logs where card_id in ${db(cardIds)} order by reviewed_at` : [];
    const [lineSettings, infoViews, puzzleProgress] = await Promise.all([
      db`select s.* from public.chapter_line_settings s join public.chapters ch on ch.id = s.chapter_id join public.courses c on c.id = ch.course_id where c.user_id = ${user.id}`,
      db`select * from public.info_line_views where user_id = ${user.id}`,
      db`select * from public.puzzle_line_progress where user_id = ${user.id}`,
    ]);
    return { cards: cards.map(reviewCardRow), logs: logs.map(reviewLogRow), lineSettings, infoViews, puzzleProgress };
  }

  if (operation === 'training.getCachedLineStats') {
    const rows: BackendRow[] = await db`select * from public.counter_snapshots where user_id = ${user.id} order by course_id nulls last`;
    const aggregate = rows.find((row: BackendRow) => row.course_id === null);
    return {
      totalLines: aggregate?.total_lines ?? 0,
      dueLines: aggregate?.due_lines ?? 0,
      newLines: aggregate?.new_lines ?? 0,
      computedAt: aggregate ? dateMs(aggregate.computed_at) : null,
    };
  }
  if (operation === 'training.ensureCounterSnapshot') {
    const rows = await db`select * from public.counter_snapshots where user_id = ${user.id} and course_id is null limit 1`;
    const stale = !rows[0] || Date.now() - Number(dateMs(rows[0].computed_at) ?? 0) >= 60 * 1000;
    if (stale) {
      await db`
        insert into public.counter_refresh_jobs (user_id, requested_at, status, force_refresh, error)
        values (${user.id}, now(), 'queued', true, null)
        on conflict (user_id) do update set requested_at = excluded.requested_at, status = 'queued', force_refresh = public.counter_refresh_jobs.force_refresh or excluded.force_refresh, error = null
      `;
    }
    return rows[0] ? dateMs(rows[0].computed_at) : null;
  }
  if (operation === 'training.getCourseLineProgress') {
    const ids = Array.isArray(args.courseIds) ? args.courseIds.map(String).slice(0, 50) : [];
    if (ids.length === 0) return [];
    const rows: BackendRow[] = await db`select * from public.counter_snapshots where user_id = ${user.id} and course_id in ${db(ids)} order by course_id`;
    return rows.map((row: BackendRow) => ({ courseId: row.course_id, total: row.total_lines, learned: row.learned_lines, due: row.due_lines, newLines: row.new_lines }));
  }

  if (operation === 'analyze.getCached') {
    const source = String(args.source);
    const limit = Math.min(500, Math.max(1, Number(args.limit ?? 100)));
    const rows = await db`select * from public.analyzed_games where user_id = ${user.id} and source = ${source} order by played_at desc limit ${limit}`;
    return {
      rows: rows.map((row: any) => ({ ...row, _id: row.id, source: row.source, gameId: row.game_id, whiteUsername: row.white_username, blackUsername: row.black_username, playedAt: dateMs(row.played_at), timeControl: row.time_control, playedAs: row.played_as, deviationKind: row.deviation_kind, deviationMoveNumber: row.deviation_move_number, deviationPly: row.deviation_ply, playedSan: row.played_san, expectedSans: row.expected_sans, deviationFen: row.deviation_fen, totalPlies: row.total_plies, deviationPositionId: row.deviation_position_id })),
      lastSyncedAt: null,
    };
  }
  if (operation === 'analyze.storeOne' || operation === 'analyze.storeSync') {
    const incoming = operation === 'analyze.storeOne' ? [args] : (Array.isArray(args.rows) ? args.rows : []);
    const stored: any[] = [];
    for (const row of incoming as any[]) {
      if (!row) continue;
      const source = String(row.source ?? args.source);
      const gameId = String(row.gameId);
      const existing = await db`select id from public.analyzed_games where user_id = ${user.id} and source = ${source} and game_id = ${gameId} limit 1`;
      const values = {
        url: row.url ?? null,
        white_username: row.whiteUsername ?? '', black_username: row.blackUsername ?? '', result: row.result ?? '*', played_at: row.playedAt ? new Date(row.playedAt) : new Date(), opening: row.opening ?? null, time_control: row.timeControl ?? null, pgn: row.pgn ?? '', played_as: row.playedAs ?? 'white', deviation_kind: row.deviationKind ?? 'parse_error', deviation_move_number: row.deviationMoveNumber ?? null, deviation_ply: row.deviationPly ?? null, played_san: row.playedSan ?? null, expected_sans: row.expectedSans ? db.json(row.expectedSans) : null, deviation_fen: row.deviationFen ?? null, total_plies: row.totalPlies ?? 0, deviation_position_id: row.deviationPositionId ?? null, analyzed_at: new Date(), annotations: row.annotations ?? null,
      };
      if (existing[0]) {
        const updated = await db`update public.analyzed_games set url = ${values.url}, white_username = ${values.white_username}, black_username = ${values.black_username}, result = ${values.result}, played_at = ${values.played_at}, opening = ${values.opening}, time_control = ${values.time_control}, pgn = ${values.pgn}, played_as = ${values.played_as}, deviation_kind = ${values.deviation_kind}, deviation_move_number = ${values.deviation_move_number}, deviation_ply = ${values.deviation_ply}, played_san = ${values.played_san}, expected_sans = ${values.expected_sans}, deviation_fen = ${values.deviation_fen}, total_plies = ${values.total_plies}, deviation_position_id = ${values.deviation_position_id}, analyzed_at = ${values.analyzed_at}, annotations = ${values.annotations} where id = ${existing[0].id} returning *`;
        stored.push(updated[0]);
      } else {
        const inserted = await db`insert into public.analyzed_games (user_id, source, game_id, url, white_username, black_username, result, played_at, opening, time_control, pgn, played_as, deviation_kind, deviation_move_number, deviation_ply, played_san, expected_sans, deviation_fen, total_plies, deviation_position_id, analyzed_at, annotations) values (${user.id}, ${source}, ${gameId}, ${values.url}, ${values.white_username}, ${values.black_username}, ${values.result}, ${values.played_at}, ${values.opening}, ${values.time_control}, ${values.pgn}, ${values.played_as}, ${values.deviation_kind}, ${values.deviation_move_number}, ${values.deviation_ply}, ${values.played_san}, ${values.expected_sans}, ${values.deviation_fen}, ${values.total_plies}, ${values.deviation_position_id}, ${values.analyzed_at}, ${values.annotations}) returning *`;
        stored.push(inserted[0]);
      }
    }
    return operation === 'analyze.storeOne' ? (stored[0] ? { ...stored[0], _id: stored[0].id } : null) : { rows: stored.map((row) => ({ ...row, _id: row.id, gameId: row.game_id })), lastSyncedAt: Date.now() };
  }
  if (operation === 'analyze.saveAnnotations') {
    await db`update public.analyzed_games set annotations = ${String(args.annotations ?? '')} where id = ${String(args.id)} and user_id = ${user.id}`;
    return null;
  }

  if (operation === 'import.listCourseImports') {
    const rows: BackendRow[] = await db`
      select ci.* from public.course_imports ci
      join public.courses c on c.id = ci.course_id
      where ci.course_id = ${String(args.courseId)} and c.user_id = ${user.id}
      order by ci.created_at desc limit 50
    `;
    const result = [];
    for (const row of rows) {
      const chapters: BackendRow[] = await db`select * from public.course_import_chapters where import_id = ${row.id} order by sort_order`;
      result.push({
        ...row,
        _id: row.id,
        courseId: row.course_id,
        userId: row.user_id,
        totalChapters: row.total_chapters,
        completedChapters: row.completed_chapters,
        failedChapters: row.failed_chapters,
        createdAt: dateMs(row.created_at),
        updatedAt: dateMs(row.updated_at),
        chapters: chapters.map((chapter: BackendRow) => ({
          _id: chapter.id,
          chapterName: chapter.chapter_name,
          chapterType: chapter.chapter_type,
          sourceChapterId: chapter.source_chapter_id,
          sourceFile: chapter.source_file,
          status: chapter.status,
          totalMoves: chapter.total_moves,
          processedMoves: chapter.processed_moves,
          createdChapterId: chapter.created_chapter_id,
          error: chapter.error,
        })),
      });
    }
    return result;
  }

  if (operation === 'import.importTreeIntoChapter') {
    const courseRows = await db`select * from public.courses where id = ${String(args.courseId)} and user_id = ${user.id} limit 1`;
    if (!courseRows[0]) throw new Error('Course not found');
    const result = await db.begin((tx: any) => insertImportedChapter(tx, user.id, courseRows[0], args));
    return { chapterId: result.chapter.id, movesCreated: result.movesCreated, movesSkipped: 0 };
  }
  if (operation === 'import.createCourseImport') {
    const chapters = Array.isArray(args.chapters) ? args.chapters : [];
    if (chapters.length === 0) throw new Error('No chapters to import');
    return db.begin(async (tx: any) => {
      const courseRows = await tx`select * from public.courses where id = ${String(args.courseId)} and user_id = ${user.id} for update`;
      if (!courseRows[0]) throw new Error('Course not found');
    const imports = await tx`
      insert into public.course_imports (course_id, user_id, request_id, status, total_chapters, completed_chapters, updated_at)
      values (${courseRows[0].id}, ${user.id}, ${args.requestId ?? null}, 'processing', ${chapters.length}, 0, now())
      on conflict (user_id, request_id) do nothing returning id
    `;
    if (!imports[0]) {
      const [existing] = await tx`select id from public.course_imports where user_id = ${user.id} and request_id = ${args.requestId} and course_id = ${courseRows[0].id}`;
      if (!existing) throw new Error('Import request belongs to another course');
      return existing.id;
    }
    const importId = imports[0].id;
    const [order] = await tx`select coalesce(max(sort_order), -1) + 1 as start from public.chapters where course_id = ${courseRows[0].id}`;
    let completed = 0;
    for (const chapterInput of chapters) {
      const result = await insertImportedChapter(tx, user.id, courseRows[0], { ...chapterInput, sortOrder: Number(order.start) + completed });
      await tx`
        insert into public.course_import_chapters (import_id, course_id, user_id, chapter_name, chapter_type, sort_order, course_color, root_fen, source_chapter_id, source_file, status, total_moves, processed_moves, move_chunk_count, created_chapter_id)
        values (${importId}, ${courseRows[0].id}, ${user.id}, ${chapterInput.chapterName}, ${chapterInput.chapterType ?? 'training'}, ${chapterInput.sortOrder ?? completed}, ${courseRows[0].color}, ${chapterInput.rootFen ?? ''}, ${chapterInput.sourceChapterId ?? null}, ${chapterInput.sourceFile ?? null}, 'done', ${(chapterInput.moves ?? []).length}, ${(chapterInput.moves ?? []).length}, 0, ${result.chapter.id})
      `;
      completed++;
    }
    await tx`update public.course_imports set status = 'done', completed_chapters = ${completed}, updated_at = now() where id = ${importId}`;
    await tx`insert into public.counter_refresh_jobs (user_id, requested_at, status, force_refresh) values (${user.id}, now(), 'queued', true) on conflict (user_id) do update set requested_at = excluded.requested_at, status = 'queued', force_refresh = true`;
      return importId;
    });
  }
  if (operation === 'import.importBundle') return importBundle(db, user.id, args.bundle);

  throw new Error(`Supabase operation is not migrated yet: ${operation}`);
}
