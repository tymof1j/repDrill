'use client';

import { useRef, useState } from 'react';
import { importPgnAction } from '../../actions';
import {
  FieldLabel,
  PremiumButton,
  PremiumPanel,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';

export function PgnImportForm({ courseId }: { courseId: string }) {
  const [pgn, setPgn] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setPgn(text);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <PremiumPanel className="max-w-4xl">
      <form action={importPgnAction} className="space-y-6 p-6 md:p-8">
        <input type="hidden" name="courseId" value={courseId} />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-[1.75rem] border border-dashed p-8 text-center text-sm font-semibold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] ${
            dragging
              ? 'border-[#73d5a0]/60 bg-[#167753]/[0.16] text-[#bff2d1]'
              : 'border-[#f8f1df]/15 bg-[#f8f1df]/[0.06] text-[#b9af98] hover:border-[#c8b68c]/50 hover:bg-[#f8f1df]/[0.10]'
          }`}
        >
          {dragging ? 'Drop the .pgn file here' : 'Drag a .pgn file here, or click to browse'}
          <input
            ref={fileRef}
            type="file"
            accept=".pgn"
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        <FieldLabel label="PGN" required>
          <textarea
            name="pgn"
            required
            rows={16}
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder='[Event "Sicilian Najdorf"]&#10;[White "Repertoire"]&#10;&#10;1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *'
            className={`${fieldClassName} font-mono`}
          />
        </FieldLabel>

        <div className="flex flex-col gap-3 sm:flex-row">
          <PremiumButton type="submit">Import</PremiumButton>
          <SecondaryButton href={`/courses/${courseId}`}>Cancel</SecondaryButton>
        </div>
      </form>
    </PremiumPanel>
  );
}
