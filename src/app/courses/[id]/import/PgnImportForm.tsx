'use client';

import { useRef, useState } from 'react';
import { importPgnAction } from '../../actions';
import {
  FieldLabel,
  PremiumButton,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';

export function PgnImportForm({ courseId }: { courseId: string }) {
  const [pgn, setPgn] = useState('');
  const [sourceFiles, setSourceFiles] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const allFiles = Array.from(files);
    const texts = await Promise.all(allFiles.map((f) => f.text()));
    setPgn(texts.join('\n\n'));
    setSourceFiles(allFiles.map((f) => f.name).join('\n'));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  };

  return (
    <form
      action={importPgnAction}
      className="max-w-4xl space-y-8 border-y border-[color:var(--paper-edge)] py-8"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="sourceFiles" value={sourceFiles} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        className={`group cursor-pointer border-2 border-dashed bg-[color:var(--paper-shade)] px-8 py-14 text-center transition-colors duration-200 ${
          dragging
            ? 'border-[color:var(--margin-red)] bg-[color:var(--paper-deep)]'
            : 'border-[color:var(--paper-edge)] hover:border-[color:var(--ink)] hover:bg-[color:var(--paper-deep)]'
        }`}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Source · § 1
        </p>
        <p className="mt-3 font-display text-2xl font-medium leading-tight text-[color:var(--ink)] md:text-3xl">
          {dragging ? (
            <>
              Drop the <span className="font-display-italic">.pgn</span> here.
            </>
          ) : (
            <>
              Drop a <span className="font-display-italic">.pgn</span>, or click to browse.
            </>
          )}
        </p>
        <p className="mt-3 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
          Each game becomes a chapter; variations and comments are preserved.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pgn"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <FieldLabel label="Or paste the PGN directly" required hint="any standard format">
        <textarea
          name="pgn"
          required
          rows={16}
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder={'[Event "Sicilian Najdorf"]\n[White "Repertoire"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *'}
          className={`${fieldClassName} notation`}
        />
      </FieldLabel>

      <div className="flex flex-wrap gap-3 pt-4">
        <PremiumButton type="submit">Import</PremiumButton>
        <SecondaryButton href={`/courses/${courseId}`}>Cancel</SecondaryButton>
      </div>
    </form>
  );
}
