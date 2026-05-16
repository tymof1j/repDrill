'use client';

import { useState } from 'react';
import { DeviationViewer } from '@/app/analyze/AnalyzePanel';
import type { GameAnalysisRow } from '@/app/analyze/actions';

export function SharedAnalysisView({
  game,
  initialAnnotations,
}: {
  game: GameAnalysisRow;
  initialAnnotations?: Record<number, string>;
}) {
  const [ply, setPly] = useState(0);
  return (
    <DeviationViewer
      game={game}
      ply={ply}
      setPly={setPly}
      onBack={() => {}}
      readOnly
      initialAnnotations={initialAnnotations}
    />
  );
}
