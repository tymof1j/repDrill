/* eslint-disable @typescript-eslint/no-explicit-any */
export type Id<Table extends string = string> = Table extends string ? string : never;

// The adapter deliberately keeps the Convex-shaped response boundary loose while
// the individual operations are being ported. Callers still receive the same
// field names as the old API; operation-level schemas can be tightened once the
// cutover is complete.
export interface BackendRow {
  [key: string]: any;
  _id: string;
  id: string;
  chapters: BackendRow[];
  courses: BackendRow[];
  moves: BackendRow[];
  positions: BackendRow[];
  choices: BackendRow[];
  invitations: BackendRow[];
  course: BackendRow;
  owner: BackendRow;
  resource: BackendRow;
  game: BackendRow;
  rows: BackendRow[];
  fen: string;
  annotation: string | null;
  san: string;
  uci: string;
  parentFen: string;
  childFen: string;
  parentPositionId: string;
  childPositionId: string;
  moveNumber: number;
  colorToMove: 'white' | 'black';
  isUserMove: boolean;
  cardId: string | null;
  chapterId: string;
  lineIndex: number;
  lineKey: string;
  grade: any;
  category: any;
  nextReviewAt: number | null;
  lineId: string;
  chapterSortOrder: number;
  chapterLineIndex: number;
  courseId: string;
  courseName: string;
  courseColor: 'white' | 'black';
  chapterName: string;
  steps: BackendRow[];
  isNew: boolean;
  dueCount: number;
  isInfoOnly: boolean;
}
export type BackendTree = {
  course: BackendRow;
  repertoire: BackendRow;
  chapters: BackendRow[];
  moves: BackendRow[];
  positions: BackendRow[];
  choices: BackendRow[];
  courses: BackendRow[];
  rootPositionId?: string | null;
  [key: string]: any;
};

export type BackendChapterTree = {
  moves: BackendRow[];
  positions: BackendRow[];
};

export type BackendTrainingLines = {
  lines: BackendRow[];
  totalLines: number;
  dueLines: number;
  newLines: number;
};

export type BackendAnalyzeCache = {
  rows: BackendRow[];
  lastSyncedAt: number | null;
};

export type BackendReviewExport = {
  cards: BackendRow[];
  logs: BackendRow[];
};

export type BackendShareSettings = {
  linkAccess: 'none' | 'view' | 'copy' | 'collaborate';
  token: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  title?: string;
  invitations: Array<{ id: string; email: string; access: 'view' | 'copy' | 'collaborate'; notify: boolean }>;
};

type RowListRef =
  | 'courses.list'
  | 'courses.listChapters'
  | 'repertoires.list'
  | 'sharing.listSharedCourses'
  | 'sharing.listSharedRepertoires'
  | 'sharing.listSharedAnalysis'
  | 'sharing.listMySharedAnalysis'
  | 'import.listCourseImports'
  | 'training.getCourseLineProgress'
  | 'training.getCourseLineStatuses';

type TreeRef = 'courses.getTree' | 'repertoires.loadTree';
type ChapterTreeRef = 'courses.getChapterTree' | 'courses.getPublicChapterTree';

export type BackendResult<Ref extends string> =
  Ref extends RowListRef ? BackendRow[]
  : Ref extends TreeRef ? BackendTree
  : Ref extends ChapterTreeRef ? BackendChapterTree
  : Ref extends 'training.getTrainingLines' ? BackendTrainingLines
  : Ref extends 'analyze.getCached' ? BackendAnalyzeCache
  : Ref extends 'sharing.getSettings' ? BackendShareSettings
  : Ref extends 'training.exportReviewData' ? BackendReviewExport
  : Ref extends 'courses.get' | 'repertoires.get' | 'courses.getPublicByToken' | 'repertoires.getPublicByToken' | 'analyze.getPublicByToken' ? BackendRow | null
  : BackendRow;
