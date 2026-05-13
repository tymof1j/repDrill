'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  PremiumButton,
  SecondaryButton,
  GhostButton,
  StatTile,
  EmptyState,
} from '@/components/ui/Premium';
import dynamic from 'next/dynamic';

const ChessBoard = dynamic(
  () => import('@/components/board/ChessBoard').then((m) => ({ default: m.ChessBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full animate-pulse rounded bg-[color:var(--paper-rule)]" />
    ),
  },
);
import {
  analyzeRecentGames,
  importAnalyzedGameToCourse,
  loadCachedAnalyze,
  type AnalyzeBatchResult,
  type GameAnalysisRow,
} from './actions';

type Source = 'lichess' | 'chesscom';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SYNC_COOLDOWN_MS = 4 * 60 * 1000;

function summarizeRows(rows: GameAnalysisRow[]): AnalyzeBatchResult {
  const totals = { inBook: 0, leftBook: 0, noRepertoire: 0, parseError: 0 };
  const deviationCounts = new Map<
    string,
    { fen: string; moveNumber?: number; played?: string; count: number }
  >();
  for (const row of rows) {
    if (row.deviation.kind === 'in_book') totals.inBook++;
    else if (row.deviation.kind === 'left_book') totals.leftBook++;
    else if (row.deviation.kind === 'no_repertoire_for_color') totals.noRepertoire++;
    else totals.parseError++;

    if (row.deviation.kind === 'left_book' && row.deviation.deviationFen) {
      const key = `${row.deviation.deviationFen}::${row.deviation.playedSan ?? ''}`;
      const existing = deviationCounts.get(key);
      if (existing) existing.count++;
      else {
        deviationCounts.set(key, {
          fen: row.deviation.deviationFen,
          moveNumber: row.deviation.deviationMoveNumber,
          played: row.deviation.playedSan,
          count: 1,
        });
      }
    }
  }
  const topDeviations = Array.from(deviationCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return { rows, totals, topDeviations };
}

export function AnalyzePanel({
  initialUsername,
  hasLichess,
  hasChessCom,
}: {
  initialUsername: { lichess: string | null; chesscom: string | null };
  hasLichess: boolean;
  hasChessCom: boolean;
}) {
  const CACHE_KEY = 'repdrill-analyze-last-v1';
  const [source, setSource] = useState<Source>(hasLichess ? 'lichess' : 'chesscom');
  const [limit, setLimit] = useState<10 | 25 | 50>(10);
  const [result, setResult] = useState<AnalyzeBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [activeGame, setActiveGame] = useState<GameAnalysisRow | null>(null);
  const [activePly, setActivePly] = useState<number>(0);

  const username =
    source === 'lichess' ? initialUsername.lichess : initialUsername.chesscom;
  const [cached, setCached] = useState<AnalyzeBatchResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { result?: AnalyzeBatchResult; source?: Source; limit?: 10 | 25 | 50 };
      if (parsed.source) setSource(parsed.source);
      if (parsed.limit) setLimit(parsed.limit);
      if (parsed.result) setResult(parsed.result);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadCachedAnalyze(source, 10);
        if (cancelled || !loaded) return;
        setCached(loaded.result);
        setLastSyncedAt(loaded.lastSyncedAt);
      } catch {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    if (result) return;
    if (!cached || cached.rows.length === 0) return;
    setResult(cached);
  }, [cached, result]);

  const nextSyncAt = lastSyncedAt ? lastSyncedAt + SYNC_COOLDOWN_MS : 0;
  const remainingMs = Math.max(0, nextSyncAt - nowMs);
  const syncBlocked = remainingMs > 0;

  const onAnalyze = () => {
    setError(null);
    const fd = new FormData();
    fd.set('source', source);
    fd.set('limit', String(limit));
    start(async () => {
      try {
        const r = await analyzeRecentGames(fd);
        setResult(r);
        setCached(r);
        setLastSyncedAt(Date.now());
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify({ result: r, source, limit }));
        } catch {
          // no-op
        }
        setActiveGame(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const onOpenGame = (g: GameAnalysisRow) => {
    setActiveGame(g);
    // Jump to deviation if it exists; otherwise start at 0.
    if (g.deviation.kind === 'left_book' && g.deviation.deviationPly) {
      setActivePly(g.deviation.deviationPly);
    } else {
      setActivePly(g.deviation.totalPlies);
    }
  };

  if (activeGame) {
    return (
      <DeviationViewer
        game={activeGame}
        ply={activePly}
        setPly={setActivePly}
        onBack={() => setActiveGame(null)}
      />
    );
  }

  return (
    <section className="space-y-8">
      <div className="border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-5 py-5 md:px-7 md:py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Source · § 1
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
          <SourceToggle
            value={source}
            onChange={setSource}
            hasLichess={hasLichess}
            hasChessCom={hasChessCom}
          />
          <LimitToggle value={limit} onChange={setLimit} />
          <div className="flex items-center gap-3">
            <PremiumButton
              type="button"
              onClick={onAnalyze}
              disabled={pending || !username || syncBlocked}
            >
              {pending ? 'Analyzing…' : syncBlocked ? `Wait ${Math.ceil(remainingMs / 1000)}s` : 'Analyze'}
            </PremiumButton>
            {!username && (
              <SecondaryButton href="/settings">Add username</SecondaryButton>
            )}
          </div>
        </div>
        {username && (
          <p className="mt-4 font-display-italic text-[14px] text-[color:var(--ink-soft)]">
            Pulling last <span className="tabular-nums">{limit}</span> games for{' '}
            <span className="font-display not-italic text-[color:var(--ink)]">
              {username}
            </span>{' '}
            on {source === 'lichess' ? 'Lichess' : 'Chess.com'}.
          </p>
        )}
        {lastSyncedAt && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            Last sync: {new Date(lastSyncedAt).toLocaleString()}
          </p>
        )}
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]">
          Sync limit: once every 4 minutes.
        </p>
        {error && (
          <p className="mt-4 border-l-2 border-[color:var(--margin-red)] pl-3 font-mono text-[11px] text-[color:var(--margin-red)]">
            {error}
          </p>
        )}
      </div>

      {result && <BatchSummary result={result} />}

      {result && result.rows.length > 0 ? (
        <GameList rows={result.rows} onOpen={onOpenGame} />
      ) : result ? (
        <EmptyState>
          No games returned. Confirm the username and that there are recent public games.
        </EmptyState>
      ) : null}
    </section>
  );
}

function SourceToggle({
  value,
  onChange,
  hasLichess,
  hasChessCom,
}: {
  value: Source;
  onChange: (s: Source) => void;
  hasLichess: boolean;
  hasChessCom: boolean;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
        Account
      </p>
      <div className="flex gap-2">
        <Pill
          active={value === 'lichess'}
          disabled={!hasLichess}
          onClick={() => hasLichess && onChange('lichess')}
        >
          Lichess
        </Pill>
        <Pill
          active={value === 'chesscom'}
          disabled={!hasChessCom}
          onClick={() => hasChessCom && onChange('chesscom')}
        >
          Chess.com
        </Pill>
      </div>
    </div>
  );
}

function LimitToggle({
  value,
  onChange,
}: {
  value: 10 | 25 | 50;
  onChange: (n: 10 | 25 | 50) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
        Games
      </p>
      <div className="flex gap-2">
        {[10, 25, 50].map((n) => (
          <Pill
            key={n}
            active={value === n}
            onClick={() => onChange(n as 10 | 25 | 50)}
          >
            {n}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-9 border px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] transition-colors duration-200 ${
        active
          ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]'
          : 'border-[color:var(--paper-edge)] text-[color:var(--ink-soft)] hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

function BatchSummary({ result }: { result: AnalyzeBatchResult }) {
  const { totals, topDeviations, rows } = result;
  const total = rows.length;
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-4">
        <StatTile
          label="Left book"
          value={totals.leftBook}
          tone="red"
          hint={`${total > 0 ? Math.round((totals.leftBook / total) * 100) : 0}% of games`}
        />
        <StatTile label="In book" value={totals.inBook} tone="green" hint="held the line" />
        <StatTile
          label="No coverage"
          value={totals.noRepertoire}
          tone="gold"
          hint="for that color"
        />
        <StatTile label="Total" value={total} hint="games analyzed" />
      </div>

      {topDeviations.length > 0 && (
        <div className="border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)]">
          <div className="border-b border-[color:var(--paper-edge)] px-5 py-3 md:px-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Most common deviations
            </p>
          </div>
          <ul className="divide-y divide-[color:var(--paper-edge)]">
            {topDeviations.map((d, i) => (
              <li key={i} className="flex items-baseline justify-between px-5 py-3 md:px-7">
                <span className="font-display-italic text-[15px] text-[color:var(--ink)]">
                  Move {d.moveNumber ?? '?'}
                  {d.played ? (
                    <>
                      {' '}— played{' '}
                      <span className="font-mono not-italic text-[color:var(--margin-red)]">
                        {d.played}
                      </span>
                    </>
                  ) : null}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] tabular-nums">
                  {d.count}×
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function GameList({
  rows,
  onOpen,
}: {
  rows: GameAnalysisRow[];
  onOpen: (g: GameAnalysisRow) => void;
}) {
  return (
    <section className="border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)]">
      <div className="border-b border-[color:var(--paper-edge)] px-5 py-3 md:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Recent games
        </p>
      </div>
      <ul className="divide-y divide-[color:var(--paper-edge)]">
        {rows.map((g) => {
          const date = new Date(g.playedAt);
          const dateLabel = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const opp =
            g.deviation.playedAs === 'white' ? g.blackUsername : g.whiteUsername;
          const youResult =
            g.deviation.playedAs === 'white'
              ? g.result === '1-0'
                ? 'Win'
                : g.result === '0-1'
                  ? 'Loss'
                  : g.result === '1/2-1/2'
                    ? 'Draw'
                    : '?'
              : g.result === '0-1'
                ? 'Win'
                : g.result === '1-0'
                  ? 'Loss'
                  : g.result === '1/2-1/2'
                    ? 'Draw'
                    : '?';
          return (
            <li key={`${g.source}-${g.gameId}`}>
              <button
                type="button"
                onClick={() => onOpen(g)}
                className="flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4 text-left transition-colors duration-200 hover:bg-[color:var(--paper-deep)] md:px-7"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[1.05rem] font-medium text-[color:var(--ink)]">
                    vs <span className="font-display-italic">{opp}</span>
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                    {g.deviation.playedAs} · {youResult} · {dateLabel}
                    {g.opening ? ` · ${g.opening}` : ''}
                  </p>
                </div>
                <DeviationBadge dev={g.deviation} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DeviationBadge({ dev }: { dev: GameAnalysisRow['deviation'] }) {
  if (dev.kind === 'in_book') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--library-green)]">
        Stayed in book
      </span>
    );
  }
  if (dev.kind === 'no_repertoire_for_color') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        No coverage
      </span>
    );
  }
  if (dev.kind === 'parse_error') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        Parse error
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--margin-red)]">
      Left book · move {dev.deviationMoveNumber ?? '?'}
    </span>
  );
}

function DeviationViewer({
  game,
  ply,
  setPly,
  onBack,
}: {
  game: GameAnalysisRow;
  ply: number;
  setPly: (p: number) => void;
  onBack: () => void;
}) {
  const [pliesState, setPliesState] = useState<
    { san: string; uci: string; fenAfter: string; fenBefore: string }[] | null
  >(null);
  const [loadingPlies, setLoadingPlies] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [annotationDraft, setAnnotationDraft] = useState('');
  const [importPending, startImport] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Lazily fetch full ply list (we don't include it in the batch result for size).
  if (pliesState === null && !loadingPlies) {
    setLoadingPlies(true);
    const fd = new FormData();
    fd.set('pgn', game.pgn);
    fd.set(
      'username',
      game.deviation.playedAs === 'white' ? game.whiteUsername : game.blackUsername,
    );
    fd.set('white', game.whiteUsername);
    fd.set('black', game.blackUsername);
    import('./actions').then(async (m) => {
      const detail = await m.getGameDeviationDetail(fd);
      setPliesState(detail.plies);
    });
  }

  if (!pliesState) {
    return (
      <section className="space-y-6">
        <GhostButton onClick={onBack}>← Back to games</GhostButton>
        <p className="font-display-italic text-[15px] text-[color:var(--ink-soft)]">
          Loading game…
        </p>
      </section>
    );
  }

  const fen = ply === 0 ? STARTING_FEN : pliesState[ply - 1].fenAfter + ' 0 1';
  const lastMove =
    ply === 0
      ? undefined
      : ([
          pliesState[ply - 1].uci.slice(0, 2),
          pliesState[ply - 1].uci.slice(2, 4),
        ] as [string, string]);

  const arrows: { orig: string; dest: string; brush: string }[] = [];
  if (
    game.deviation.kind === 'left_book' &&
    game.deviation.deviationPly &&
    ply === game.deviation.deviationPly
  ) {
    const devUci = pliesState[ply - 1]?.uci;
    if (devUci) {
      arrows.push({
        orig: devUci.slice(0, 2),
        dest: devUci.slice(2, 4),
        brush: 'red',
      });
    }
  }

  const orientation = game.deviation.playedAs;
  const totalPlies = pliesState.length;

  useEffect(() => {
    const date = new Date(game.playedAt);
    const dateLabel = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    setChapterName(
      `${game.whiteUsername} vs ${game.blackUsername} · ${dateLabel}`,
    );
  }, [game.playedAt, game.whiteUsername, game.blackUsername]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPly(Math.max(0, ply - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPly(Math.min(totalPlies, ply + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ply, setPly, totalPlies]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <GhostButton onClick={onBack}>← Back to games</GhostButton>
        {game.url && (
          <a
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] underline-offset-[6px] hover:text-[color:var(--margin-red)]"
          >
            Open on {game.source === 'lichess' ? 'Lichess' : 'Chess.com'}
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,480px)_1fr]">
        <div>
          <ChessBoard
            fen={fen}
            orientation={orientation}
            lastMove={lastMove}
            viewOnly
            arrows={arrows}
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <SecondaryButton onClick={() => setPly(Math.max(0, ply - 1))}>
              ← Prev
            </SecondaryButton>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] tabular-nums">
              Ply {ply} / {totalPlies}
            </span>
            <SecondaryButton onClick={() => setPly(Math.min(totalPlies, ply + 1))}>
              Next →
            </SecondaryButton>
          </div>
          {game.deviation.kind === 'left_book' && game.deviation.deviationPly && (
            <div className="mt-3 flex justify-center">
              <GhostButton onClick={() => setPly(game.deviation.deviationPly!)}>
                Jump to deviation
              </GhostButton>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {game.deviation.kind === 'left_book' && (
            <div className="border-l-2 border-[color:var(--margin-red)] bg-[color:var(--paper-shade)] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--margin-red)]">
                Deviation · move {game.deviation.deviationMoveNumber}
              </p>
              <p className="mt-2 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
                You played{' '}
                <span className="font-mono not-italic text-[color:var(--margin-red)]">
                  {game.deviation.playedSan}
                </span>
                .
                {game.deviation.expectedSans && game.deviation.expectedSans.length > 0 ? (
                  <>
                    {' '}
                    Repertoire says{' '}
                    {game.deviation.expectedSans.map((s, i) => (
                      <span key={s}>
                        {i > 0 ? ' or ' : ''}
                        <span className="font-mono not-italic text-[color:var(--ink)]">
                          {s}
                        </span>
                      </span>
                    ))}
                    .
                  </>
                ) : (
                  <> No repertoire move from this position yet.</>
                )}
              </p>
              {game.deviation.deviationPositionId && (
                <div className="mt-4">
                  <PremiumButton
                    href={`/train?from=${encodeURIComponent(game.deviation.deviationPositionId)}`}
                  >
                    Drill this line
                  </PremiumButton>
                </div>
              )}
            </div>
          )}

          {game.deviation.kind === 'in_book' && (
            <div className="border-l-2 border-[color:var(--library-green)] bg-[color:var(--paper-shade)] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
                Stayed in book
              </p>
              <p className="mt-2 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
                Every {game.deviation.playedAs} move was in your repertoire.
              </p>
            </div>
          )}

          <MoveList plies={pliesState} ply={ply} setPly={setPly} deviationPly={game.deviation.deviationPly} />

          <section className="border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Import to course
            </p>
            <p className="mt-2 font-display-italic text-[14px] text-[color:var(--ink-soft)]">
              Saved to course <span className="font-display not-italic text-[color:var(--ink)]">Game analysis</span> as a new chapter.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="Chapter name"
                className="min-h-10 border border-[color:var(--paper-edge)] bg-transparent px-3 text-[15px] text-[color:var(--ink)] outline-none transition-colors duration-150 focus:border-[color:var(--ink)]"
              />
              <textarea
                value={annotationDraft}
                onChange={(e) => setAnnotationDraft(e.target.value)}
                placeholder="Optional annotation for current position"
                rows={3}
                className="border border-[color:var(--paper-edge)] bg-transparent px-3 py-2 text-[14px] text-[color:var(--ink)] outline-none transition-colors duration-150 focus:border-[color:var(--ink)]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <PremiumButton
                  onClick={() => {
                    setImportMessage(null);
                    const fd = new FormData();
                    fd.set('pgn', game.pgn);
                    fd.set('playedAs', game.deviation.playedAs);
                    fd.set('chapterName', chapterName.trim());
                    fd.set('annotation', annotationDraft.trim());
                    fd.set('annotatedPly', String(ply));
                    startImport(async () => {
                      try {
                        const r = await importAnalyzedGameToCourse(fd);
                        setImportMessage(`Imported as chapter “${r.chapterName}”.`);
                      } catch (e) {
                        setImportMessage(e instanceof Error ? e.message : 'Import failed.');
                      }
                    });
                  }}
                  disabled={importPending || !chapterName.trim()}
                >
                  {importPending ? 'Importing…' : 'Import game'}
                </PremiumButton>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]">
                  Use ← / → to navigate moves
                </span>
              </div>
              {importMessage && (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                  {importMessage}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function MoveList({
  plies,
  ply,
  setPly,
  deviationPly,
}: {
  plies: { san: string }[];
  ply: number;
  setPly: (p: number) => void;
  deviationPly?: number;
}) {
  const tokens = plies.map((p, i) => {
    const moveNumber = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const prefix = isWhite ? `${moveNumber}.` : '';
    return { key: `${i}-${p.san}`, text: `${prefix}${p.san}`, ply: i + 1 };
  });

  return (
    <div className="border-y border-[color:var(--paper-edge)]">
      <div className="border-b border-[color:var(--paper-edge)] px-0 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Line
        </p>
      </div>
      <div className="max-h-[400px] overflow-y-auto px-0 py-3 font-mono text-[12px] tabular-nums">
        <div className="flex flex-wrap gap-2">
          {tokens.map((t) => (
            <PlyButton
              key={t.key}
              active={ply === t.ply}
              deviation={t.ply === deviationPly}
              onClick={() => setPly(t.ply)}
            >
              {t.text}
            </PlyButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlyButton({
  active,
  deviation,
  onClick,
  children,
}: {
  active?: boolean;
  deviation?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 ${
        active
          ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]'
          : deviation
            ? 'bg-transparent text-[color:var(--margin-red)] hover:bg-[color:var(--paper-edge)]'
            : 'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'
      }`}
    >
      {children}
    </button>
  );
}
