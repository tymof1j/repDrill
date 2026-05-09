'use client';

import { useState } from 'react';
import {
  RepertoireViewer,
  type ViewerMove,
  type ViewerPosition,
} from '@/components/repertoire/RepertoireViewer';
import {
  PremiumButton,
  SecondaryButton,
  fieldClassName,
  FieldLabel,
} from '@/components/ui/Premium';
import { copySharedCourseAction } from '../../courses/actions';

type Course = { id: string; name: string; color: 'white' | 'black' };

export function SharePublicView({
  course,
  chapters,
  rootPositionId,
  positions,
  moves,
  viewerIsAuthed,
}: {
  course: Course;
  chapters: { id: string; name: string }[];
  rootPositionId: string;
  positions: ViewerPosition[];
  moves: ViewerMove[];
  viewerIsAuthed: boolean;
}) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyName, setCopyName] = useState(`${course.name} (copy)`);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-baseline gap-3">
        {viewerIsAuthed ? (
          <PremiumButton onClick={() => setCopyOpen((v) => !v)}>
            {copyOpen ? 'Cancel copy' : 'Add to my courses'}
          </PremiumButton>
        ) : (
          <SecondaryButton href="/login">Sign in to copy</SecondaryButton>
        )}
      </div>

      {copyOpen && viewerIsAuthed && (
        <form
          action={copySharedCourseAction}
          className="max-w-2xl space-y-5 border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-6 py-6"
        >
          <input type="hidden" name="sourceCourseId" value={course.id} />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Copy into your library
          </p>
          <FieldLabel label="New course name">
            <input
              name="newName"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              className={fieldClassName}
              autoFocus
            />
          </FieldLabel>
          <div className="flex gap-3">
            <PremiumButton type="submit">Copy course</PremiumButton>
            <SecondaryButton onClick={() => setCopyOpen(false)}>Cancel</SecondaryButton>
          </div>
          <p className="font-display-italic text-[13px] text-[color:var(--ink-soft)]">
            All chapters, positions, moves, and annotations are duplicated into your
            account. Your existing FSRS state is unaffected.
          </p>
        </form>
      )}

      <RepertoireViewer
        repertoireColor={course.color}
        rootPositionId={rootPositionId}
        positions={positions}
        moves={moves}
        chapters={chapters}
      />
    </div>
  );
}
