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
  shareToken,
  chapters,
  rootPositionId,
  positions,
  moves,
  viewerIsAuthed,
  access,
}: {
  course: Course;
  shareToken: string;
  chapters: { id: string; name: string }[];
  rootPositionId: string;
  positions: ViewerPosition[];
  moves: ViewerMove[];
  viewerIsAuthed: boolean;
  access: 'view' | 'copy' | 'collaborate';
}) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyName, setCopyName] = useState(`${course.name} (copy)`);
  const loginHref = `/sign-in?returnTo=${encodeURIComponent(`/share/${shareToken}`)}`;
  const accessLabel =
    access === 'collaborate'
      ? 'Full access: view, copy, and collaborate where supported'
      : access === 'copy'
        ? 'Copy access: view and add this course to your library'
        : 'View access: inspect this course without changing it';

  return (
    <div className="space-y-10">
      <section className="border-y border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-5 py-5 md:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Your access
        </p>
        <p className="mt-2 text-[15px] leading-7 text-[color:var(--ink)]">{accessLabel}</p>
        <ol className="mt-4 grid gap-2 text-[14px] leading-6 text-[color:var(--ink-soft)] md:grid-cols-3">
          <li><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">1</span> Sign in to attach this share to your account.</li>
          <li><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">2</span> Copy-enabled shares create a private course under Courses.</li>
          <li><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">3</span> Email invites appear under the “Shared with you” tab after login.</li>
        </ol>
      </section>

      <div className="flex flex-wrap items-baseline gap-3">
        {access === 'view' ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            View-only link
          </span>
        ) : viewerIsAuthed ? (
          <PremiumButton onClick={() => setCopyOpen((v) => !v)}>
            {copyOpen ? 'Cancel copy' : 'Add to my courses'}
          </PremiumButton>
        ) : (
          <SecondaryButton href={loginHref}>
            {access === 'collaborate' ? 'Sign in for full access' : 'Sign in to copy'}
          </SecondaryButton>
        )}
      </div>

      {copyOpen && viewerIsAuthed && (
        <form
          action={copySharedCourseAction}
          className="max-w-2xl space-y-5 border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-6 py-6"
        >
          <input type="hidden" name="sourceCourseId" value={course.id} />
          <input type="hidden" name="shareToken" value={shareToken} />
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
