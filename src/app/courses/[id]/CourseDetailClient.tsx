'use client';

import { useMemo, useState, useTransition } from 'react';
import { GripVertical, Pencil } from 'lucide-react';
import { useQuery } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase/api';
import type { Id } from '@/lib/supabase/types';
import {
  RepertoireViewer,
  type ViewerMove,
  type ViewerPosition,
} from '@/components/repertoire/RepertoireViewer';
import {
  AppSurface,
  BackLink,
  GhostButton,
  PremiumButton,
  SecondaryButton,
  Stamp,
  fieldClassName,
} from '@/components/ui/Premium';
import {
  CourseCover,
  ProgressBar,
  formatFenSummary,
  getCourseCoverUrl,
  getCourseMeta,
} from '../CourseVisuals';
import {
  renameCourseAction,
  renameChapterAction,
  deleteChapterAction,
  updateAnnotationAction,
  setLineInfoOnlyAction,
  reorderChaptersAction,
} from '../actions';
import { ShareDialog } from '@/components/share/ShareDialog';

type Props = {
  course: {
    id: string;
    name: string;
    color: string;
    description: string | null;
    isPublic: boolean;
    shareToken: string | null;
  };
  chapters: { id: string; name: string }[];
  rootPositionId: string;
  positions: ViewerPosition[];
  moves: ViewerMove[];
  lineStatuses: {
    chapterId: string;
    lineIndex: number;
    lineKey: string;
    grade: 'A' | 'B' | 'C' | 'D' | 'N';
    category: 'new' | 'learning' | 'review' | 'due' | 'mastered' | 'info';
    nextReviewAt: number | null;
    isInfoOnly: boolean;
  }[];
};

type ChapterLine = {
  id: string;
  chapterId: string;
  moves: ViewerMove[];
  leafPositionId: string;
};

function formatMove(move: ViewerMove) {
  const prefix = move.colorToMove === 'white' ? `${move.moveNumber}.` : '';
  return `${prefix}${move.san}`;
}

function branchKey(move: ViewerMove) {
  return `${move.parentPositionId}:${move.childPositionId}:${move.uci}`;
}

function formatNextReview(nextReviewAt: number | null) {
  if (!nextReviewAt) return 'not scheduled';
  const deltaMs = nextReviewAt - Date.now();
  if (deltaMs <= 0) return 'due now';
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}

function buildChapterLines(
  rootPositionId: string,
  chapters: { id: string; name: string }[],
  moves: ViewerMove[],
) {
  const linesByChapter = new Map<string, ChapterLine[]>();
  for (const chapter of chapters) {
    const chapterMoves = moves.filter((move) => move.chapterId === chapter.id);
    const byParent = new Map<string, ViewerMove[]>();
    for (const move of chapterMoves) {
      const siblings = byParent.get(move.parentPositionId) ?? [];
      siblings.push(move);
      byParent.set(move.parentPositionId, siblings);
    }
    for (const siblings of byParent.values()) {
      siblings.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine));
    }

    const chapterLines: ChapterLine[] = [];
    // FENs are normalized (move counters stripped), so a chess maneuver like
    // Nf3-Ng1 can revisit a prior position. Track the positions currently in
    // the recursion path and treat re-entries as leaves to break cycles.
    const inPath = new Set<string>();
    const walk = (positionId: string, path: ViewerMove[]) => {
      const isCycle = inPath.has(positionId);
      const children = isCycle ? [] : (byParent.get(positionId) ?? []);
      const seen = new Set<string>();
      const uniqueChildren = children.filter((child) => {
        const key = branchKey(child);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueChildren.length === 0) {
        if (path.length > 0) {
          chapterLines.push({
            id: `${chapter.id}:${path.map((move) => move.id).join('-')}`,
            chapterId: chapter.id,
            moves: path,
            leafPositionId: positionId,
          });
        }
        return;
      }

      inPath.add(positionId);
      for (const child of uniqueChildren) {
        walk(child.childPositionId, [...path, child]);
      }
      inPath.delete(positionId);
    };

    const childIds = new Set(chapterMoves.map((move) => move.childPositionId));
    const roots = Array.from(new Set(chapterMoves.map((move) => move.parentPositionId)))
      .filter((positionId) => !childIds.has(positionId));
    const orderedRoots = roots.includes(rootPositionId)
      ? [rootPositionId, ...roots.filter((positionId) => positionId !== rootPositionId)]
      : roots;
    for (const root of orderedRoots) {
      walk(root, []);
    }
    linesByChapter.set(chapter.id, chapterLines);
  }
  return linesByChapter;
}

export function CourseDetailClient({ course, chapters, rootPositionId, positions, moves, lineStatuses }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(course.name);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterNameDraft, setChapterNameDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chaptersOpen, setChaptersOpen] = useState(true);
  const [chapterQuery, setChapterQuery] = useState('');
  const [chapterOrderOverride, setChapterOrderOverride] = useState<string[] | null>(null);
  const [draggingChapterId, setDraggingChapterId] = useState<string | null>(null);
  const [dragArmedChapterId, setDragArmedChapterId] = useState<string | null>(null);
  const [chapterActionError, setChapterActionError] = useState<string | null>(null);
  const router = useRouter();
  const courseImports = useQuery(api.import.listCourseImports, { courseId: course.id as Id<'courses'> }) ?? [];
  const activeImport = courseImports.find((item) => item.status === 'queued' || item.status === 'processing') ?? null;

  const baseChapterOrder = useMemo(() => chapters.map((chapter) => chapter.id), [chapters]);
  const chapterOrder = useMemo(() => {
    if (!chapterOrderOverride || chapterOrderOverride.length !== baseChapterOrder.length) return baseChapterOrder;
    const expected = new Set(baseChapterOrder);
    if (chapterOrderOverride.some((id) => !expected.has(id))) return baseChapterOrder;
    return chapterOrderOverride;
  }, [baseChapterOrder, chapterOrderOverride]);
  const chaptersById = useMemo(() => new Map(chapters.map((chapter) => [chapter.id, chapter])), [chapters]);
  const orderedChapters = useMemo(
    () => chapterOrder.map((id) => chaptersById.get(id)).filter((chapter): chapter is (typeof chapters)[number] => Boolean(chapter)),
    [chapterOrder, chaptersById],
  );

  const linesByChapter = useMemo(
    () => buildChapterLines(rootPositionId, chapters, moves),
    [chapters, moves, rootPositionId],
  );
  const selectedChapter = orderedChapters.find((chapter) => chapter.id === selectedChapterId) ?? null;
  const selectedChapterLines = useMemo(
    () => (selectedChapterId ? (linesByChapter.get(selectedChapterId) ?? []) : []),
    [linesByChapter, selectedChapterId],
  );
  const shareScopes = useMemo(() => {
    const scopes: {
      type: 'resource' | 'chapter';
      id?: string;
      label: string;
      description?: string;
    }[] = [
      { type: 'resource', label: 'Whole course', description: 'All chapters and lines' },
    ];
    scopes.push(
      ...orderedChapters.map((chapter) => ({
        type: 'chapter' as const,
        id: chapter.id,
        label: selectedChapterId === chapter.id ? `This chapter: ${chapter.name}` : `Chapter: ${chapter.name}`,
        description: `${linesByChapter.get(chapter.id)?.length ?? 0} line${(linesByChapter.get(chapter.id)?.length ?? 0) === 1 ? '' : 's'}`,
      })),
    );
    return scopes;
  }, [orderedChapters, linesByChapter, selectedChapterId]);
  const visibleMoves = useMemo(
    () =>
      selectedChapterId
        ? moves.filter((move) => move.chapterId === selectedChapterId)
        : moves,
    [moves, selectedChapterId],
  );
  const viewerRootPositionId = useMemo(() => {
    if (!selectedChapterId) return rootPositionId;
    const chapterMoves = moves.filter((move) => move.chapterId === selectedChapterId);
    const childIds = new Set(chapterMoves.map((move) => move.childPositionId));
    const roots = Array.from(new Set(chapterMoves.map((move) => move.parentPositionId)))
      .filter((positionId) => !childIds.has(positionId));
    return roots.includes(rootPositionId) ? rootPositionId : (roots[0] ?? rootPositionId);
  }, [moves, rootPositionId, selectedChapterId]);
  const lineStatusMap = useMemo(
    () => new Map(lineStatuses.map((status) => [`${status.chapterId}:${status.lineKey}`, status])),
    [lineStatuses],
  );
  const courseMeta = useMemo(
    () => getCourseMeta(course.name, course.description),
    [course.description, course.name],
  );
  const rootFen = useMemo(
    () => positions.find((position) => position.id === rootPositionId)?.fen ?? null,
    [positions, rootPositionId],
  );
  const courseProgress = useMemo(() => {
    const total = Array.from(linesByChapter.values()).reduce((sum, lines) => sum + lines.length, 0);
    const trainable = lineStatuses.filter((status) => !status.isInfoOnly && status.category !== 'info');
    const learned = trainable.filter((status) => status.category !== 'new').length;
    const due = trainable.filter((status) => status.category === 'due').length;
    const percent = total > 0 ? (learned / total) * 100 : 0;
    return { total, learned, due, percent };
  }, [lineStatuses, linesByChapter]);
  const chapterProgress = useMemo(() => {
    const result = new Map<string, { total: number; learned: number; due: number; percent: number }>();
    for (const chapter of orderedChapters) {
      const total = linesByChapter.get(chapter.id)?.length ?? 0;
      const statuses = lineStatuses.filter((status) => status.chapterId === chapter.id && !status.isInfoOnly && status.category !== 'info');
      const learned = statuses.filter((status) => status.category !== 'new').length;
      const due = statuses.filter((status) => status.category === 'due').length;
      result.set(chapter.id, { total, learned, due, percent: total > 0 ? (learned / total) * 100 : 0 });
    }
    return result;
  }, [lineStatuses, linesByChapter, orderedChapters]);

  const saveName = () => {
    if (!nameDraft.trim()) return;
    const fd = new FormData();
    fd.set('id', course.id);
    fd.set('name', nameDraft.trim());
    startTransition(() => {
      void renameCourseAction(fd);
    });
    setEditingName(false);
  };

  const startChapterRename = (ch: { id: string; name: string }) => {
    setEditingChapterId(ch.id);
    setChapterNameDraft(ch.name);
  };

  const saveChapterName = (chapterId: string) => {
    if (!chapterNameDraft.trim()) return;
    const fd = new FormData();
    fd.set('id', chapterId);
    fd.set('courseId', course.id);
    fd.set('name', chapterNameDraft.trim());
    startTransition(() => {
      void renameChapterAction(fd);
    });
    setEditingChapterId(null);
  };

  const handleDeleteChapter = (chapterId: string) => {
    const chapter = chaptersById.get(chapterId);
    if (!chapter) return;
    const lineCount = linesByChapter.get(chapterId)?.length ?? 0;
    const confirmed = window.confirm(
      `Delete “${chapter.name}”? This permanently removes its ${lineCount} line${lineCount === 1 ? '' : 's'} and training history.`,
    );
    if (!confirmed) return;

    setChapterActionError(null);
    if (selectedChapterId === chapterId) setSelectedChapterId(null);
    const fd = new FormData();
    fd.set('id', chapterId);
    fd.set('courseId', course.id);
    startTransition(() => {
      void deleteChapterAction(fd)
        .then(() => router.refresh())
        .catch((error: unknown) => {
          setChapterActionError(error instanceof Error ? error.message : 'Could not delete the chapter.');
        });
    });
  };

  const handleAnnotationSave = (positionId: string, text: string) => {
    const fd = new FormData();
    fd.set('courseId', course.id);
    fd.set('positionId', positionId);
    fd.set('text', text);
    startTransition(() => {
      void updateAnnotationAction(fd);
    });
  };

  const handleSetLineInfoOnly = (chapterId: string, lineKey: string, infoOnly: boolean) => {
    const fd = new FormData();
    fd.set('courseId', course.id);
    fd.set('chapterId', chapterId);
    fd.set('lineKey', lineKey);
    fd.set('infoOnly', infoOnly ? 'true' : 'false');
    startTransition(() => {
      void setLineInfoOnlyAction(fd);
    });
  };

  const persistChapterOrder = (nextOrder: string[]) => {
    const fd = new FormData();
    fd.set('courseId', course.id);
    fd.set('chapterIds', JSON.stringify(nextOrder));
    startTransition(() => {
      void reorderChaptersAction(fd);
    });
  };

  return (
    <AppSurface>
      <BackLink href="/courses">Courses</BackLink>

      <section className="mb-10 overflow-hidden rounded-[1.75rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] shadow-[0_24px_70px_rgba(47,58,50,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(13rem,0.34fr)_minmax(0,1fr)_minmax(14rem,0.34fr)]">
          <div className="p-4 sm:p-5 lg:p-6">
            <CourseCover
              name={course.name}
              kind={courseMeta.kind}
              compact
              coverUrl={getCourseCoverUrl(course.name, courseMeta.kind)}
            />
          </div>
          <div className="min-w-0 border-t border-[color:var(--paper-rule)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[color:var(--ink)] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)]">{courseMeta.kindLabel}</span>
              <span className="rounded-full border border-[color:var(--paper-rule)] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">{course.color === 'both' ? 'White + Black' : `${course.color} repertoire`}</span>
            </div>
            {editingName ? (
              <div className="mt-6 space-y-4">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="block w-full border-b border-[color:var(--ink)] bg-transparent pb-2 font-display text-[2.25rem] font-semibold leading-[1.03] tracking-[-0.055em] text-[color:var(--ink)] outline-none sm:text-[3.4rem]"
                  autoFocus
                />
                <div className="flex flex-wrap gap-2"><PremiumButton onClick={saveName} disabled={pending}>Save</PremiumButton><SecondaryButton onClick={() => setEditingName(false)}>Cancel</SecondaryButton></div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setNameDraft(course.name); setEditingName(true); }}
                className="group/name mt-6 block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] focus-visible:ring-offset-4"
                title="Click to rename"
              >
                <span className="block font-display text-[2.25rem] font-semibold leading-[1.03] tracking-[-0.055em] text-[color:var(--ink)] transition-colors group-hover/name:text-[color:var(--library-green)] sm:text-[3.4rem]">{course.name}</span>
                <span className="mt-2 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]"><Pencil size={12} /> Edit title</span>
              </button>
            )}
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">{course.description ?? courseMeta.shortDescription}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-[color:var(--paper-shade)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">{courseMeta.openingLabel}</span>
              {courseMeta.theoryLabels.map((label) => <span key={label} className="rounded-full bg-[color:var(--paper-shade)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">{label}</span>)}
            </div>
            {rootFen && <p className="mt-6 border-l-2 border-[color:var(--library-green)] pl-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[color:var(--ink-faint)]"><span className="text-[color:var(--ink-soft)]">Position model · </span>{formatFenSummary(rootFen)}</p>}
          </div>
          <aside className="flex flex-col border-t border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-7">
            <div className="flex items-center justify-between gap-4"><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">Course progress</span><span className="font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--library-green)]">{Math.round(courseProgress.percent)}%</span></div>
            <div className="mt-4"><ProgressBar value={courseProgress.percent} label={`${courseProgress.learned} / ${courseProgress.total || '—'} variations`} tone={courseProgress.due > 0 ? 'red' : 'green'} /></div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-y border-[color:var(--paper-rule)] py-5"><Metric value={orderedChapters.length} label="Chapters" /><Metric value={courseProgress.due} label="Due now" tone={courseProgress.due > 0 ? 'red' : 'ink'} /></div>
            <div className="mt-auto flex flex-col gap-2 pt-6 lg:sticky lg:top-6">
              <PremiumButton href={`/train?courseId=${encodeURIComponent(course.id)}`}>Review due lines <span className="ml-1">→</span></PremiumButton>
              <SecondaryButton href={`/train?courseId=${encodeURIComponent(course.id)}&mode=learn`}>Learn course <span className="ml-1">→</span></SecondaryButton>
              <div className="mt-2 flex flex-wrap gap-2"><PremiumButton href={`/courses/${course.id}/import`} className="min-h-9 px-3 py-2 text-[10px]">Import PGN</PremiumButton><SecondaryButton href={`/api/export/course?id=${course.id}`} className="min-h-9 px-3 py-2 text-[10px]">Export</SecondaryButton><ShareDialog resourceType="course" resourceId={course.id} title={course.name} scopes={shareScopes} /></div>
            </div>
          </aside>
        </div>
      </section>

      {activeImport && (
        <section className="mb-10 border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-5 py-5 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--paper-rule)] pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
              Import in progress
            </p>
            <p className="font-display-italic text-sm text-[color:var(--ink-soft)]">
              {activeImport.completedChapters}/{activeImport.totalChapters} chapters ready
            </p>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden bg-[color:var(--paper-edge)]">
            <div
              className="h-full bg-[color:var(--margin-red)] transition-all duration-300"
              style={{
                width: `${Math.max(3, Math.round((activeImport.completedChapters / Math.max(1, activeImport.totalChapters)) * 100))}%`,
              }}
            />
          </div>
          <ul className="mt-4 space-y-2">
            {activeImport.chapters.map((chapter) => {
              const tone =
                chapter.status === 'done'
                  ? 'text-[color:var(--ink)]'
                  : chapter.status === 'failed'
                    ? 'text-[color:var(--margin-red)]'
                    : 'text-[color:var(--ink-faint)]';
              const statusText =
                chapter.status === 'done'
                  ? 'ready'
                  : chapter.status === 'failed'
                    ? 'failed'
                    : chapter.status === 'processing'
                      ? `processing ${chapter.processedMoves}/${chapter.totalMoves}`
                      : 'queued';
              return (
                <li key={chapter._id} className="flex items-baseline justify-between gap-4">
                  <span className={`truncate font-display text-base ${tone}`}>{chapter.chapterName}</span>
                  <span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] ${tone}`}>
                    {statusText}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {orderedChapters.length > 0 && (
        <section id="chapters" className="mb-12 overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] shadow-[0_18px_50px_rgba(47,58,50,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-5 py-5 md:px-7">
            <button
              type="button"
              onClick={() => setChaptersOpen((v) => !v)}
              className="group flex items-baseline gap-3 text-left focus-visible:outline-none"
              aria-expanded={chaptersOpen}
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Curriculum
              </span>
              <span className="font-display text-lg font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                {orderedChapters.length} chapter{orderedChapters.length === 1 ? '' : 's'} to remember
              </span>
              <span
                aria-hidden
                className={`font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] transition-transform duration-200 ${chaptersOpen ? '' : '-rotate-90'}`}
              >
                {chaptersOpen ? 'Collapse' : 'Expand'}
              </span>
            </button>
            {selectedChapterId && (
              <GhostButton onClick={() => setSelectedChapterId(null)}>
                Show all
              </GhostButton>
            )}
          </div>

          {chaptersOpen && (
            <>
              {chapterActionError && (
                <p role="alert" className="mx-5 mt-5 rounded-lg border border-[color:var(--margin-red)]/40 bg-[color:var(--margin-red)]/10 px-4 py-3 text-sm text-[color:var(--margin-red)] md:mx-7">
                  {chapterActionError}
                </p>
              )}
              <div className="px-5 py-5 md:px-7">
                <div className="flex items-baseline gap-3 rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                    /
                  </span>
                  <input
                    type="text"
                    value={chapterQuery}
                    onChange={(e) => setChapterQuery(e.target.value)}
                    placeholder="Search chapters…"
                    className="font-display flex-1 bg-transparent text-lg italic text-[color:var(--ink)] placeholder:text-[color:var(--ink-ghost)] focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5">
                {orderedChapters.filter((ch) =>
                  !chapterQuery.trim() || ch.name.toLowerCase().includes(chapterQuery.toLowerCase())
                ).map((ch) => {
                  const originalIdx = chapterOrder.indexOf(ch.id);
                  const lineCount = linesByChapter.get(ch.id)?.length ?? 0;
                  const chapterStats = chapterProgress.get(ch.id) ?? { total: lineCount, learned: 0, due: 0, percent: 0 };
                  const active = selectedChapterId === ch.id;
                  return (
                    <li
                      key={ch.id}
                      draggable={active && !pending && dragArmedChapterId === ch.id}
                      onDragStart={(e) => {
                        if (!active || pending) {
                          e.preventDefault();
                          return;
                        }
                        setDraggingChapterId(ch.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', ch.id);
                      }}
                      onDragOver={(e) => {
                        if (!draggingChapterId || draggingChapterId === ch.id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        if (!draggingChapterId || draggingChapterId === ch.id) return;
                        e.preventDefault();
                        const fromIndex = chapterOrder.indexOf(draggingChapterId);
                        const toIndex = chapterOrder.indexOf(ch.id);
                        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
                        const nextOrder = [...chapterOrder];
                        const [moved] = nextOrder.splice(fromIndex, 1);
                        nextOrder.splice(toIndex, 0, moved);
                        setChapterOrderOverride(nextOrder);
                        setDraggingChapterId(null);
                        persistChapterOrder(nextOrder);
                      }}
                      onDragEnd={() => {
                        setDraggingChapterId(null);
                        setDragArmedChapterId(null);
                      }}
                      className={`min-w-0 rounded-2xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-4 transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green-soft)] hover:shadow-[0_14px_32px_rgba(47,58,50,0.07)] ${active ? 'bg-[color:var(--paper-shade)] shadow-[0_14px_32px_rgba(47,58,50,0.07)] sm:col-span-2' : ''}`}
                    >
                      {editingChapterId === ch.id ? (
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                          <input
                            value={chapterNameDraft}
                            onChange={(e) => setChapterNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveChapterName(ch.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            className={fieldClassName}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <SecondaryButton onClick={() => saveChapterName(ch.id)} disabled={pending}>
                              Save
                            </SecondaryButton>
                            <GhostButton onClick={() => setEditingChapterId(null)}>Cancel</GhostButton>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[2.2rem_minmax(0,1fr)] items-start gap-3">
                          <div className="flex items-center gap-1">
                            {active && (
                              <button
                                type="button"
                                className="cursor-grab text-[color:var(--ink-faint)] active:cursor-grabbing"
                                title="Drag to reorder chapter"
                                aria-label="Drag to reorder chapter"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDragArmedChapterId(ch.id);
                                }}
                                onMouseUp={() => setDragArmedChapterId(null)}
                              >
                                <GripVertical size={15} />
                              </button>
                            )}
                            <span
                              className={`font-display text-base italic ${active ? 'text-[color:var(--margin-red)]' : 'text-[color:var(--ink-faint)]'}`}
                              style={{ fontFeatureSettings: '"onum"' }}
                            >
                              {String(originalIdx + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapterId(active ? null : ch.id);
                              setJumpTarget(null);
                            }}
                            className="block min-w-0 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                          >
                            <span className="block break-words font-display text-lg font-medium leading-snug text-[color:var(--ink)]">
                              {ch.name}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                              {lineCount} variation{lineCount === 1 ? '' : 's'} · {chapterStats.learned} learned
                            </span>
                            <div className="mt-3 max-w-sm"><ProgressBar value={chapterStats.percent} label={`${Math.round(chapterStats.percent)}%`} tone={chapterStats.due > 0 ? 'red' : 'green'} /></div>
                          </button>
                          <div className="col-span-full flex flex-wrap items-center gap-2 border-t border-[color:var(--paper-rule)] pt-3">
                            <SecondaryButton
                              href={`/train?courseId=${encodeURIComponent(course.id)}&chapterId=${encodeURIComponent(ch.id)}&mode=learn`}
                              className="min-h-9 px-3 py-2 text-[10px]"
                            >
                              Learn chapter <span className="ml-1">→</span>
                            </SecondaryButton>
                            <details className="relative">
                              <summary className="list-none cursor-pointer rounded-lg px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)] transition-colors hover:bg-[color:var(--paper-deep)] hover:text-[color:var(--ink)] [&::-webkit-details-marker]:hidden">
                                Manage ···
                              </summary>
                              <div className="absolute right-0 z-10 mt-1 flex min-w-40 flex-col gap-1 rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-2 shadow-[0_18px_40px_rgba(47,58,50,0.14)]">
                                <GhostButton onClick={() => startChapterRename(ch)} className="justify-start">Rename</GhostButton>
                                <GhostButton onClick={() => handleDeleteChapter(ch.id)} disabled={pending} className="justify-start text-[color:var(--margin-red)]">
                                  Delete chapter
                                </GhostButton>
                              </div>
                            </details>
                          </div>
                        </div>
                      )}

                      {active && selectedChapterLines.length > 0 && (
                        <div className="border-t border-[color:var(--paper-rule)] px-0 py-4">
                          <div className="mb-3 flex items-baseline justify-between">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                              Lines in chapter
                            </p>
                            <Stamp tone="red">Filtered</Stamp>
                          </div>
                          <ol className="grid gap-2 lg:grid-cols-2">
                            {selectedChapterLines.map((line, lIdx) => {
                              const lineKey = line.moves.map((move) => move.uci).join(' ');
                              const status = lineStatusMap.get(`${selectedChapterId}:${lineKey}`);
                              const isInfoOnly = status?.isInfoOnly === true;
                              return (
                              <li key={line.id}>
                                <div className="flex w-full items-stretch border border-[color:var(--paper-edge)] bg-[color:var(--paper)] transition-colors duration-200 hover:bg-[color:var(--paper-deep)]">
                                  <button
                                    type="button"
                                    onClick={() => setJumpTarget(line.leafPositionId)}
                                    className="flex min-w-0 flex-1 items-baseline gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--ink)]"
                                  >
                                    <span
                                      className="font-display text-xs italic text-[color:var(--ink-faint)]"
                                      style={{ fontFeatureSettings: '"onum"' }}
                                    >
                                      {String(lIdx + 1).padStart(2, '0')}
                                    </span>
                                    <span className="notation min-w-0 flex-1 line-clamp-2 text-[12px] leading-snug text-[color:var(--ink)]">
                                      {line.moves.slice(0, 10).map(formatMove).join(' ')}
                                      {line.moves.length > 10 ? ' …' : ''}
                                    </span>
                                    {status && (
                                      <span className="hidden shrink-0 items-center gap-2 whitespace-nowrap sm:inline-flex">
                                        <span className="rounded border border-[color:var(--paper-edge)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-[color:var(--ink-faint)]">
                                          {status.grade}
                                        </span>
                                        <span className="rounded border border-[color:var(--paper-edge)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-[color:var(--ink-faint)]">
                                          {status.category}
                                        </span>
                                        <span className="font-mono text-[10px] tracking-[0.08em] text-[color:var(--ink-ghost)]">
                                          {formatNextReview(status.nextReviewAt)}
                                        </span>
                                      </span>
                                    )}
                                  </button>
                                  <span className="flex shrink-0 items-center border-l border-[color:var(--paper-edge)] px-2">
                                    <span className="mr-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
                                      {isInfoOnly ? 'Info-only' : 'Training'}
                                    </span>
                                    <GhostButton
                                      onClick={() => handleSetLineInfoOnly(ch.id, lineKey, !isInfoOnly)}
                                      disabled={pending}
                                      className="px-2 text-[9px]"
                                    >
                                      {isInfoOnly ? 'Set training' : 'Set info-only'}
                                    </GhostButton>
                                  </span>
                                </div>
                              </li>
                            )})}
                          </ol>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] shadow-[0_18px_50px_rgba(47,58,50,0.05)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-5 py-5 md:px-7">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Theory explorer</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Play the position, keep the idea.</h2>
          </div>
          <p className="max-w-md text-right text-sm leading-relaxed text-[color:var(--ink-soft)]">Select a chapter above to narrow the tree. Annotations and FEN metadata stay attached to each critical position.</p>
        </div>
        <div className="p-3 sm:p-5">
          <RepertoireViewer
            key={selectedChapterId ?? 'all-chapters'}
            repertoireColor={course.color as 'white' | 'black'}
            rootPositionId={viewerRootPositionId}
            positions={positions}
            moves={visibleMoves}
            chapters={chapters}
            selectedChapterName={selectedChapter?.name ?? null}
            onAnnotationSave={handleAnnotationSave}
            jumpToPositionId={jumpTarget}
            onJumpDone={() => setJumpTarget(null)}
          />
        </div>
      </section>
    </AppSurface>
  );
}

function Metric({ value, label, tone = 'ink' }: { value: number | string; label: string; tone?: 'ink' | 'red' }) {
  return (
    <div>
      <p className={`font-display text-2xl font-semibold tracking-[-0.04em] ${tone === 'red' ? 'text-[color:var(--margin-red)]' : 'text-[color:var(--ink)]'}`}>{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">{label}</p>
    </div>
  );
}
