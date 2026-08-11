// Types for the training flow, decoupled from database
export type LineStep = {
  san: string;
  uci: string;
  parentFen: string;
  childFen: string;
  parentPositionId: string;
  childPositionId: string;
  moveNumber: number;
  isUserMove: boolean;
  annotation: string | null;
  /** Structured PGN drawings/NAG metadata persisted on the move. */
  annotations?: {
    nags?: number[];
    directives?: Array<{
      name: string;
      args: Record<string, string>;
      value?: string;
      raw: string;
    }>;
    arrows?: Array<{ start: string; end: string; color?: string; raw?: string }>;
    circles?: Array<{ square: string; color?: string; raw?: string }>;
    clocks?: string[];
  } | null;
  cardId: string | null;
  isNew: boolean;
};

export type TrainingLine = {
  lineId: string;
  courseId: string;
  chapterId: string;
  lineKey: string;
  courseName: string;
  courseColor: 'white' | 'black';
  chapterName: string;
  steps: LineStep[];
  isNew: boolean;
  dueCount: number;
  isInfoOnly: boolean;
};
