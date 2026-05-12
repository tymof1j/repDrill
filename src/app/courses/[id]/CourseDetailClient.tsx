'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  RepertoireViewer,
  type ViewerMove,
  type ViewerPosition,
} from '@/components/repertoire/RepertoireViewer';
import { AnnotationSearch } from '@/components/repertoire/AnnotationSearch';
import {
  AppSurface,
  BackLink,
  GhostButton,
  PageHeader,
  PremiumButton,
  SecondaryButton,
  Stamp,
  fieldClassName,
} from '@/components/ui/Premium';
import {
  renameCourseAction,
  renameChapterAction,
  deleteChapterAction,
  updateAnnotationAction,
} from '../actions';
import { SharePanel } from './SharePanel';

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
};

type ChapterLine = {
  id: string;
  chapterId: string;
  moves: ViewerMove[];
  leafPositionId: string;
};

function formatMove(move: ViewerMove) {
  const prefix = move.colorToMove === 'black' ? `${move.moveNumber}.` : `${move.moveNumber}…`;
  return `${prefix} ${move.san}`;
}

function branchKey(move: ViewerMove) {
  return `${move.parentPositionId}:${move.childPositionId}:${move.uci}`;
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

    if (rootPositionId) {
      walk(rootPositionId, []);
    }
    linesByChapter.set(chapter.id, chapterLines);
  }
  return linesByChapter;
}

export function CourseDetailClient({ course, chapters, rootPositionId, positions, moves }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(course.name);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterNameDraft, setChapterNameDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chaptersOpen, setChaptersOpen] = useState(true);

  const linesByChapter = useMemo(
    () => buildChapterLines(rootPositionId, chapters, moves),
    [chapters, moves, rootPositionId],
  );
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? null;
  const selectedChapterLines = selectedChapterId ? (linesByChapter.get(selectedChapterId) ?? []) : [];
  const visibleMoves = useMemo(
    () =>
      selectedChapterId
        ? moves.filter((move) => move.chapterId === selectedChapterId)
        : moves,
    [moves, selectedChapterId],
  );

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
    const fd = new FormData();
    fd.set('id', chapterId);
    fd.set('courseId', course.id);
    startTransition(() => {
      void deleteChapterAction(fd);
    });
  };

  const handleAnnotationSave = (positionId: string, text: string) => {
    const fd = new FormData();
    fd.set('positionId', positionId);
    fd.set('text', text);
    startTransition(() => {
      void updateAnnotationAction(fd);
    });
  };

  return (
    <AppSurface>
      <BackLink href="/courses">Courses</BackLink>

      <PageHeader
        eyebrow={`Course · ${course.color}`}
        title={
          editingName ? (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="block w-full max-w-3xl bg-transparent font-display text-[2.75rem] font-medium leading-[1.02] tracking-[-0.01em] text-[color:var(--ink)] outline-none focus:border-b focus:border-[color:var(--ink)] md:text-[4rem]"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(course.name);
                setEditingName(true);
              }}
              className="text-left transition-colors duration-200 hover:text-[color:var(--margin-red)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
              title="Click to rename"
            >
              {course.name}
            </button>
          )
        }
        body={course.description ?? 'Navigate the imported tree, edit annotations, and search critical notes.'}
        action={
          editingName ? (
            <>
              <PremiumButton onClick={saveName} disabled={pending}>
                Save
              </PremiumButton>
              <SecondaryButton onClick={() => setEditingName(false)}>Cancel</SecondaryButton>
            </>
          ) : (
            <>
              <PremiumButton href={`/courses/${course.id}/import`}>Import PGN</PremiumButton>
              <SecondaryButton href={`/api/export/course?id=${course.id}`}>Export PGN</SecondaryButton>
            </>
          )
        }
      />

      <SharePanel
        courseId={course.id}
        isPublic={course.isPublic}
        shareToken={course.shareToken}
      />

      {chapters.length > 0 && (
        <section className="mb-12 border-y border-[color:var(--paper-edge)]">
          <div className="flex items-center justify-between gap-4 border-b border-[color:var(--paper-rule)] px-5 py-3 md:px-7">
            <button
              type="button"
              onClick={() => setChaptersOpen((v) => !v)}
              className="group flex items-baseline gap-3 text-left focus-visible:outline-none"
              aria-expanded={chaptersOpen}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Table of contents
              </span>
              <span className="font-display-italic text-base text-[color:var(--ink)]">
                {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
              </span>
              <span
                aria-hidden
                className={`font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] transition-transform duration-200 ${chaptersOpen ? '' : '-rotate-90'}`}
              >
                ▾
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
              <div className="px-5 py-5 md:px-7">
                <AnnotationSearch
                  positions={positions}
                  onSelect={(posId) => setJumpTarget(posId)}
                  alwaysOpen
                />
              </div>

              <ul className="divide-y divide-[color:var(--paper-rule)] border-t border-[color:var(--paper-rule)]">
                {chapters.map((ch, idx) => {
                  const lineCount = linesByChapter.get(ch.id)?.length ?? 0;
                  const active = selectedChapterId === ch.id;
                  return (
                    <li
                      key={ch.id}
                      className={`px-5 transition-colors duration-200 md:px-7 ${
                        active ? 'bg-[color:var(--paper-shade)]' : 'hover:bg-[color:var(--paper-shade)]'
                      }`}
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
                        <div className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-4">
                          <span
                            className={`font-display text-base italic ${active ? 'text-[color:var(--margin-red)]' : 'text-[color:var(--ink-faint)]'}`}
                            style={{ fontFeatureSettings: '"onum"' }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapterId(active ? null : ch.id);
                              setJumpTarget(null);
                            }}
                            className="block min-w-0 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                          >
                            <span className="block truncate font-display text-lg font-medium text-[color:var(--ink)]">
                              {ch.name}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                              {lineCount} line{lineCount === 1 ? '' : 's'}
                            </span>
                          </button>
                          <div className="flex items-center gap-3">
                            <GhostButton onClick={() => startChapterRename(ch)}>Rename</GhostButton>
                            <GhostButton onClick={() => handleDeleteChapter(ch.id)} disabled={pending}>
                              Delete
                            </GhostButton>
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
                            {selectedChapterLines.map((line, lIdx) => (
                              <li key={line.id}>
                                <button
                                  type="button"
                                  onClick={() => setJumpTarget(line.leafPositionId)}
                                  className="flex w-full items-baseline gap-3 border border-[color:var(--paper-edge)] bg-[color:var(--paper)] px-3 py-2 text-left transition-colors duration-200 hover:bg-[color:var(--paper-deep)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                                >
                                  <span
                                    className="font-display text-xs italic text-[color:var(--ink-faint)]"
                                    style={{ fontFeatureSettings: '"onum"' }}
                                  >
                                    {String(lIdx + 1).padStart(2, '0')}
                                  </span>
                                  <span className="notation line-clamp-2 text-[12px] leading-snug text-[color:var(--ink)]">
                                    {line.moves.slice(0, 10).map(formatMove).join(' ')}
                                    {line.moves.length > 10 ? ' …' : ''}
                                  </span>
                                </button>
                              </li>
                            ))}
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

      {chapters.length === 0 && (
        <section className="mb-12 border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-8 py-12 text-center">
          <p className="font-display-italic text-lg leading-relaxed text-[color:var(--ink-soft)]">
            This course has no chapters. Import a PGN to seed the move tree.
          </p>
          <PremiumButton href={`/courses/${course.id}/import`} className="mt-5">
            Import PGN
          </PremiumButton>
        </section>
      )}

      <RepertoireViewer
        key={selectedChapterId ?? 'all-chapters'}
        repertoireColor={course.color as 'white' | 'black'}
        rootPositionId={rootPositionId}
        positions={positions}
        moves={visibleMoves}
        chapters={chapters}
        selectedChapterName={selectedChapter?.name ?? null}
        onAnnotationSave={handleAnnotationSave}
        jumpToPositionId={jumpTarget}
        onJumpDone={() => setJumpTarget(null)}
      />
    </AppSurface>
  );
}
