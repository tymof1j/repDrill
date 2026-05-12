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
  cardId: string | null;
  isNew: boolean;
};

export type TrainingLine = {
  lineId: string;
  courseName: string;
  courseColor: 'white' | 'black';
  chapterName: string;
  steps: LineStep[];
  isNew: boolean;
  dueCount: number;
};
