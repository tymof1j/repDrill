'use client';

import { useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import {
  AppSurface,
  BackLink,
  EmptyState,
  GhostButton,
  PageHeader,
  PremiumButton,
  SecondaryButton,
  Stamp,
} from '@/components/ui/Premium';
import {
  MergedRepertoireViewer,
  type MergedMove,
  type MergedPosition,
  type MergedChoice,
} from '@/components/repertoire/MergedRepertoireViewer';
import { ShareDialog } from '@/components/share/ShareDialog';
import { AddCourseForm } from './AddCourseForm';
import { renameRepertoireAction, removeCourseFromRepertoireAction } from '../actions';

type BoundCourse = {
  id: string;
  name: string;
  color: 'white' | 'black';
};

type AvailableCourse = {
  id: string;
  name: string;
  color: 'white' | 'black';
};

type ShareScope =
  | { type: 'resource'; label: string; description: string }
  | { type: 'course'; id: string; label: string; description: string };

type Props = {
  repertoireId: string;
  repertoireName: string;
  repertoireDescription: string | null;
  boundCourses: BoundCourse[];
  availableCourses: AvailableCourse[];
  shareScopes: ShareScope[];
  rootPositionId: string;
  positions: MergedPosition[];
  moves: MergedMove[];
  choices: MergedChoice[];
};

export function RepertoireDetailClient({
  repertoireId,
  repertoireName,
  repertoireDescription,
  boundCourses,
  availableCourses,
  shareScopes,
  rootPositionId,
  positions,
  moves,
  choices,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(repertoireName);
  const [pending, startTransition] = useTransition();

  const saveName = () => {
    if (!nameDraft.trim()) return;
    const fd = new FormData();
    fd.set('id', repertoireId);
    fd.set('name', nameDraft.trim());
    startTransition(() => void renameRepertoireAction(fd));
    setEditingName(false);
  };

  return (
    <AppSurface>
      <BackLink href="/repertoires">Repertoires</BackLink>
      <PageHeader
        eyebrow="Volume · merged repertoire"
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
                setNameDraft(repertoireName);
                setEditingName(true);
              }}
              className="group/name flex items-baseline gap-3 text-left transition-colors duration-200 hover:text-[color:var(--margin-red)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
              title="Click to rename"
            >
              {repertoireName}
              <Pencil size={16} className="mb-0.5 shrink-0 self-center opacity-0 transition-opacity group-hover/name:opacity-40" />
            </button>
          )
        }
        body={repertoireDescription ?? 'Resolve overlapping course theory and inspect the combined move tree as a single bound preparation.'}
        action={
          editingName ? (
            <>
              <PremiumButton onClick={saveName} disabled={pending}>
                Save
              </PremiumButton>
              <SecondaryButton onClick={() => setEditingName(false)}>Cancel</SecondaryButton>
            </>
          ) : (
            <ShareDialog
              resourceType="repertoire"
              resourceId={repertoireId}
              title={repertoireName}
              scopes={shareScopes}
            />
          )
        }
      />

      <section className="mb-12 border-y border-[color:var(--paper-edge)]">
        <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--paper-rule)] px-5 py-3 md:px-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Bound courses
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] tabular-nums">
            {boundCourses.length} active
          </p>
        </div>

        {boundCourses.length === 0 ? (
          <p className="px-5 py-6 font-display-italic text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:px-7">
            No courses added yet. Bind one below to start building this repertoire.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--paper-rule)]">
            {boundCourses.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4 px-5 py-4 md:px-7"
              >
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-lg font-medium text-[color:var(--ink)]">
                    {c.name}
                  </h3>
                  <Stamp tone={c.color === 'white' ? 'ink' : 'red'}>
                    {c.color}
                  </Stamp>
                </div>
                <form action={removeCourseFromRepertoireAction}>
                  <input type="hidden" name="repertoireId" value={repertoireId} />
                  <input type="hidden" name="courseId" value={c.id} />
                  <GhostButton type="submit">Remove</GhostButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        {availableCourses.length > 0 && (
          <AddCourseForm
            repertoireId={repertoireId}
            courses={availableCourses}
          />
        )}

        {availableCourses.length === 0 && boundCourses.length === 0 && (
          <p className="border-t border-[color:var(--paper-rule)] px-5 py-5 font-display-italic text-[15px] text-[color:var(--ink-soft)] md:px-7">
            You have no courses yet.{' '}
            <Link href="/courses/new" className="book-link text-[color:var(--ink)] hover:text-[color:var(--margin-red)]">
              Create one
            </Link>
            .
          </p>
        )}
      </section>

      {boundCourses.length > 0 ? (
        <MergedRepertoireViewer
          repertoireId={repertoireId}
          rootPositionId={rootPositionId}
          positions={positions}
          moves={moves}
          choices={choices}
        />
      ) : (
        <EmptyState>Bind at least one course to unlock the merged-repertoire viewer.</EmptyState>
      )}
    </AppSurface>
  );
}
