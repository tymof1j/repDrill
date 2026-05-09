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
  FieldLabel,
  GhostButton,
  PageHeader,
  PremiumButton,
  PremiumPanel,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';
import {
  renameCourseAction,
  renameChapterAction,
  deleteChapterAction,
  updateAnnotationAction,
} from '../actions';

type Props = {
  course: { id: string; name: string; color: string; description: string | null };
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
  const prefix = move.colorToMove === 'black' ? `${move.moveNumber}.` : `${move.moveNumber}...`;
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
    const walk = (positionId: string, path: ViewerMove[]) => {
      const children = byParent.get(positionId) ?? [];
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

      for (const child of uniqueChildren) {
        walk(child.childPositionId, [...path, child]);
      }
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
        eyebrow={`${course.color} course`}
        title={
          editingName ? (
            <span className="block max-w-2xl">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className={`${fieldClassName} text-3xl font-semibold md:text-5xl`}
                autoFocus
              />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(course.name);
                setEditingName(true);
              }}
              className="rounded-lg text-left transition-colors duration-200 hover:text-[#7dd3c7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
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
            <PremiumButton href={`/courses/${course.id}/import`}>Import PGN</PremiumButton>
          )
        }
      />

      {chapters.length > 0 && (
        <PremiumPanel className="mb-8">
          <div className="p-5 md:p-6">
            <div className="mb-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">
                Search annotations
              </p>
              <AnnotationSearch
                positions={positions}
                onSelect={(posId) => setJumpTarget(posId)}
                alwaysOpen
              />
            </div>

            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">
                  Chapters
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f4faf7]">{chapters.length} imported</h2>
              </div>
              {selectedChapterId && (
                <SecondaryButton onClick={() => setSelectedChapterId(null)} className="px-4 py-2 text-xs">
                  Show all
                </SecondaryButton>
              )}
            </div>

            <ul className="grid gap-2 md:grid-cols-2">
              {chapters.map((ch) => (
                <li
                  key={ch.id}
                  className={`rounded-xl border p-3 transition-colors duration-200 ${
                    selectedChapterId === ch.id
                      ? 'border-[#7dd3c7]/45 bg-[#7dd3c7]/[0.10]'
                      : 'border-transparent bg-[#172225]'
                  }`}
                >
                  {editingChapterId === ch.id ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
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
                      <PremiumButton onClick={() => saveChapterName(ch.id)} disabled={pending} className="py-2">
                        Save
                      </PremiumButton>
                      <SecondaryButton onClick={() => setEditingChapterId(null)} className="py-2">
                        Cancel
                      </SecondaryButton>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChapterId(ch.id);
                          setJumpTarget(null);
                        }}
                        className="min-w-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
                      >
                        <span className="block truncate text-sm font-semibold text-[#f4faf7]">{ch.name}</span>
                        <span className="mt-1 block text-xs text-[#8fa3a0]">
                          {linesByChapter.get(ch.id)?.length ?? 0} lines
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <GhostButton onClick={() => startChapterRename(ch)}>Rename</GhostButton>
                        <GhostButton onClick={() => handleDeleteChapter(ch.id)} disabled={pending}>
                          Delete
                        </GhostButton>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {selectedChapter && (
              <div className="mt-5 rounded-xl border border-[#7dd3c7]/20 bg-[#7dd3c7]/[0.07] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fcfc6]">
                      Chapter lines
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[#f2f7f4]">{selectedChapter.name}</h3>
                  </div>
                  <span className="rounded-md bg-[#0b1416]/60 px-3 py-1 text-xs font-semibold text-[#b8d8d3]">
                    Board filtered
                  </span>
                </div>

                {selectedChapterLines.length === 0 ? (
                  <p className="text-sm leading-6 text-[#9fb0aa]">No complete lines in this chapter yet.</p>
                ) : (
                  <ol className="grid gap-2 lg:grid-cols-2">
                    {selectedChapterLines.map((line, index) => (
                      <li key={line.id}>
                        <button
                          type="button"
                          onClick={() => setJumpTarget(line.leafPositionId)}
                          className="flex w-full items-start gap-3 rounded-lg bg-[#0f181a]/80 px-3 py-3 text-left transition-colors duration-200 hover:bg-[#142124] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#7dd3c7]/15 text-xs font-semibold text-[#a8e7df]">
                            {index + 1}
                          </span>
                          <span className="line-clamp-2 font-mono text-xs leading-5 text-[#dfe8e4]">
                            {line.moves.slice(0, 10).map(formatMove).join(' ')}
                            {line.moves.length > 10 ? ' ...' : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </PremiumPanel>
      )}

      {chapters.length === 0 && (
        <PremiumPanel className="mb-8">
          <div className="p-8">
            <FieldLabel label="Empty course">
              <p className="text-sm leading-6 text-[#aebdb8]">
                Import a PGN to create chapters and start navigating this course.
              </p>
            </FieldLabel>
          </div>
        </PremiumPanel>
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
