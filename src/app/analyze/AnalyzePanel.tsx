/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/refs */
'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@/lib/supabase/client';
import { api } from '@/lib/supabase/api';
import {
  PremiumButton,
  SecondaryButton,
  GhostButton,
  StatTile,
  EmptyState,
  PremiumPanel,
} from '@/components/ui/Premium';
import { ResizableDiagramFrame } from '@/components/board/ResizableDiagramFrame';
import dynamic from 'next/dynamic';
import { ShareDialog } from '@/components/share/ShareDialog';
import {
  type ArrowTheme,
  PREFERENCES_EVENT,
  getArrowBrushes,
  getBoardBrushes,
  getArrowTheme,
  normalizeArrowTheme,
} from '@/lib/preferences';

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
  ensureAnalyzedGameStored,
  importAnalyzedGameToCourse,
  loadCachedAnalyze,
  type AnalyzeBatchResult,
  type GameAnalysisRow,
} from './actions';

type Source = 'lichess' | 'chesscom';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SYNC_COOLDOWN_MS = 4 * 60 * 1000;

function relativeDayLabel(timestamp: number, now = Date.now()) {
  const target = new Date(timestamp);
  const today = new Date(now);
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.max(0, Math.floor((todayDay - targetDay) / 86_400_000));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === 2) return 'Day before yesterday';
  return `${days} days ago`;
}

function ClockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.25 2" />
    </svg>
  );
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const CACHE_KEY = 'repdrill-analyze-last-v1';
  const [source, setSource] = useState<Source>(hasLichess ? 'lichess' : 'chesscom');
  const [limit, setLimit] = useState<10 | 25 | 50>(10);
  const [result, setResult] = useState<AnalyzeBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [activeGame, setActiveGame] = useState<GameAnalysisRow | null>(null);
  const [activePly, setActivePly] = useState<number>(0);
  const [tab, setTab] = useState<'mine' | 'shared' | 'sent'>(searchParams.get('shared') ? 'shared' : searchParams.get('sent') ? 'sent' : 'mine');
  const sharedGames = useQuery(api.sharing.listSharedAnalysis);
  const sentGames = useQuery(api.sharing.listMySharedAnalysis);

  const username =
    source === 'lichess' ? initialUsername.lichess : initialUsername.chesscom;
  const [cached, setCached] = useState<AnalyzeBatchResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 60_000);
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

  const onOpenGame = (g: GameAnalysisRow, plyOverride?: number) => {
    const gameKey = `${g.source}:${g.gameId}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set('game', gameKey);
    const nextPly =
      plyOverride ??
      (g.deviation.kind === 'left_book' && g.deviation.deviationPly
        ? g.deviation.deviationPly
        : g.deviation.totalPlies);
    params.set('ply', String(nextPly));
    router.push(`/analyze?${params.toString()}`);
    setActiveGame(g);
    setActivePly(nextPly);
  };

  // Keep refs updated each render so the effect below can read latest values
  // without needing them as deps (which would cause race-condition loops).
  const activeGameRef = useRef(activeGame);
  activeGameRef.current = activeGame;
  const activePlyRef = useRef(activePly);
  activePlyRef.current = activePly;
  const onOpenGameRef = useRef(onOpenGame);
  onOpenGameRef.current = onOpenGame;

  useEffect(() => {
    if (!result || result.rows.length === 0) return;
    const gameParam = searchParams.get('game');
    if (!gameParam) {
      // URL has no game → clear active game (handles back-button navigation)
      if (activeGameRef.current !== null) setActiveGame(null);
      return;
    }
    const plyParam = parseInt(searchParams.get('ply') ?? '', 10);
    const found = result.rows.find((r) => `${r.source}:${r.gameId}` === gameParam);
    if (!found) return;
    const ag = activeGameRef.current;
    if (!ag || ag.gameId !== found.gameId || ag.source !== found.source) {
      onOpenGameRef.current(found, Number.isFinite(plyParam) && plyParam >= 0 ? plyParam : undefined);
      return;
    }
    // Only sync ply from URL when it genuinely differs (avoids reverting in-flight ply updates)
    if (Number.isFinite(plyParam) && plyParam >= 0 && plyParam !== activePlyRef.current) {
      setActivePly(plyParam);
    }
  }, [result, searchParams]);

  if (activeGame) {
    const activeGameWithId = {
      ...activeGame,
      id:
        activeGame.id ??
        cached?.rows.find((row) => row.source === activeGame.source && row.gameId === activeGame.gameId)?.id ??
        result?.rows.find((row) => row.source === activeGame.source && row.gameId === activeGame.gameId)?.id,
    };
    return (
      <DeviationViewer
        game={activeGameWithId}
        ply={activePly}
        setPly={(p) => {
          setActivePly(p);
          const params = new URLSearchParams(searchParams.toString());
          params.set('ply', String(p));
          router.replace(`/analyze?${params.toString()}`);
        }}
        onBack={() => {
          setActiveGame(null);
          const params = new URLSearchParams(searchParams.toString());
          params.delete('game');
          params.delete('ply');
          const qs = params.toString();
          router.push(qs ? `/analyze?${qs}` : '/analyze');
        }}
      />
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-[color:var(--paper-edge)] pb-3">
        <Pill active={tab === 'mine'} onClick={() => setTab('mine')}>
          My analysis
        </Pill>
        <Pill active={tab === 'shared'} onClick={() => setTab('shared')}>
          Shared with you
        </Pill>
        <Pill active={tab === 'sent'} onClick={() => setTab('sent')}>
          You shared
        </Pill>
      </div>

      {tab === 'shared' ? (
        sharedGames && sharedGames.length > 0 ? (
          <GameList
            rows={sharedGames.map((item) => ({
              id: item.resource._id,
              source: item.resource.source,
              gameId: item.resource.gameId,
              url: item.resource.url,
              whiteUsername: item.resource.whiteUsername,
              blackUsername: item.resource.blackUsername,
              result: item.resource.result,
              playedAt: new Date(item.resource.playedAt).toISOString(),
              opening: item.resource.opening,
              timeControl: item.resource.timeControl,
              pgn: item.resource.pgn,
              deviation: {
                kind: item.resource.deviationKind,
                playedAs: item.resource.playedAs,
                deviationMoveNumber: item.resource.deviationMoveNumber,
                deviationPly: item.resource.deviationPly,
                playedSan: item.resource.playedSan,
                expectedSans: item.resource.expectedSans,
                deviationFen: item.resource.deviationFen,
                deviationPositionId: item.resource.deviationPositionId,
                totalPlies: item.resource.totalPlies,
              },
            }))}
            onOpen={onOpenGame}
          />
        ) : (
          <EmptyState>No shared analysis games yet.</EmptyState>
        )
      ) : tab === 'sent' ? (
        sentGames && sentGames.length > 0 ? (
          <GameList
            rows={sentGames.map((item) => ({
              id: item.resource._id,
              source: item.resource.source,
              gameId: item.resource.gameId,
              url: item.resource.url,
              whiteUsername: item.resource.whiteUsername,
              blackUsername: item.resource.blackUsername,
              result: item.resource.result,
              playedAt: new Date(item.resource.playedAt).toISOString(),
              opening: item.resource.opening,
              timeControl: item.resource.timeControl,
              pgn: item.resource.pgn,
              deviation: {
                kind: item.resource.deviationKind,
                playedAs: item.resource.playedAs,
                deviationMoveNumber: item.resource.deviationMoveNumber,
                deviationPly: item.resource.deviationPly,
                playedSan: item.resource.playedSan,
                expectedSans: item.resource.expectedSans,
                deviationFen: item.resource.deviationFen,
                deviationPositionId: item.resource.deviationPositionId,
                totalPlies: item.resource.totalPlies,
              },
            }))}
            onOpen={onOpenGame}
          />
        ) : (
          <EmptyState>No games shared by you yet.</EmptyState>
        )
      ) : (
        <>
      <PremiumPanel innerClassName="p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--paper-rule)] pb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Game source
            </p>
            {username && (
              <p className="mt-2 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
                Last <span className="tabular-nums">{limit}</span> games for{' '}
                <span className="font-display not-italic text-[color:var(--ink)]">{username}</span>
                {' '}on {source === 'lichess' ? 'Lichess' : 'Chess.com'}.
              </p>
            )}
          </div>
          {lastSyncedAt && (
            <span
              title={new Date(lastSyncedAt).toLocaleString()}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]"
            >
              <ClockIcon /> Synced {relativeDayLabel(lastSyncedAt)}
            </span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-5">
          <SourceToggle value={source} onChange={setSource} hasLichess={hasLichess} hasChessCom={hasChessCom} />
          <LimitToggle value={limit} onChange={setLimit} />
          <div className="flex items-center gap-3">
            <PremiumButton type="button" onClick={onAnalyze} disabled={pending || !username || syncBlocked}>
              {pending ? 'Analyzing…' : syncBlocked ? `Wait ${Math.ceil(remainingMs / 1000)}s` : 'Analyze games'}
            </PremiumButton>
            {!username && <SecondaryButton href="/settings">Add username</SecondaryButton>}
          </div>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]">
          Sync limit: once every 4 minutes.
        </p>
        {error && (
          <p className="mt-4 border-l-2 border-[color:var(--margin-red)] pl-3 font-mono text-[11px] text-[color:var(--margin-red)]">{error}</p>
        )}
      </PremiumPanel>

      {result && <BatchSummary result={result} />}

      {result && result.rows.length > 0 ? (
        <GameList rows={result.rows} onOpen={onOpenGame} />
      ) : result ? (
        <EmptyState>
          No games returned. Confirm the username and that there are recent public games.
        </EmptyState>
      ) : null}
        </>
      )}
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
          const relativeDate = relativeDayLabel(date.getTime());
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
                <div className="flex items-center gap-4">
                  <span title={dateLabel} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                    <ClockIcon /> {relativeDate}
                  </span>
                  <DeviationBadge dev={g.deviation} />
                </div>
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

export function DeviationViewer({
  game,
  ply,
  setPly,
  onBack,
  readOnly,
  initialAnnotations,
}: {
  game: GameAnalysisRow;
  ply: number;
  setPly: (p: number) => void;
  onBack: () => void;
  readOnly?: boolean;
  initialAnnotations?: Record<number, string>;
}) {
  const [pliesState, setPliesState] = useState<
    { san: string; uci: string; fenAfter: string; fenBefore: string }[] | null
  >(null);
  const [loadingPlies, setLoadingPlies] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [annotationsByPly, setAnnotationsByPly] = useState<Record<number, string>>({});
  const [importPending, startImport] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [annotationSaved, setAnnotationSaved] = useState(false);
  const [shareId, setShareId] = useState(game.id ?? null);
  const [sharePending, startShare] = useTransition();
  const [showArrows, setShowArrows] = useState(true);
  const [showHighlights, setShowHighlights] = useState(true);
  const [arrowTheme, setArrowTheme] = useState<ArrowTheme>(() => getArrowTheme());

  useEffect(() => {
    let cancelled = false;
    setPliesState(null);
    setLoadingPlies(true);
    const fd = new FormData();
    fd.set('pgn', game.pgn);
    fd.set(
      'username',
      game.deviation.playedAs === 'white' ? game.whiteUsername : game.blackUsername,
    );
    fd.set('white', game.whiteUsername);
    fd.set('black', game.blackUsername);
    import('./actions')
      .then((m) => m.getGameDeviationDetail(fd))
      .then((detail) => {
        if (!cancelled) setPliesState(detail.plies);
      })
      .catch(() => {
        if (!cancelled) setPliesState([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlies(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game.pgn, game.deviation.playedAs, game.whiteUsername, game.blackUsername]);

  const totalPlies = pliesState?.length ?? 0;

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

  const annotationKey = `${game.source}:${game.gameId}:annotations`;
  useEffect(() => {
    if (readOnly) {
      setAnnotationsByPly(initialAnnotations ?? {});
      return;
    }
    try {
      const raw = window.localStorage.getItem(annotationKey);
      if (!raw) {
        setAnnotationsByPly({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, string>;
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const idx = Number(k);
        if (Number.isFinite(idx) && idx >= 0 && typeof v === 'string') next[idx] = v;
      }
      setAnnotationsByPly(next);
    } catch {
      setAnnotationsByPly({});
    }
  }, [annotationKey, readOnly, initialAnnotations]);

  useEffect(() => {
    if (readOnly) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(annotationKey, JSON.stringify(annotationsByPly));
        setAnnotationSaved(true);
      } catch {
        // no-op
      }
      if (game.id) {
        import('./actions').then((m) => m.saveAnalysisAnnotations(game.id!, annotationsByPly)).catch(() => {});
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [annotationKey, annotationsByPly, readOnly, game.id]);

  useEffect(() => {
    if (!annotationSaved) return;
    const timer = window.setTimeout(() => setAnnotationSaved(false), 1100);
    return () => window.clearTimeout(timer);
  }, [annotationSaved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPly(Math.max(0, ply - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPly(Math.min(totalPlies, ply + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPly(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPly(totalPlies);
      } else if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowArrows((s) => !s);
      } else if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHighlights((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    const prefHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ arrowTheme?: string }>).detail;
      setArrowTheme(normalizeArrowTheme(detail?.arrowTheme ?? getArrowTheme()));
    };
    window.addEventListener(PREFERENCES_EVENT, prefHandler as EventListener);
    window.addEventListener('storage', prefHandler as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PREFERENCES_EVENT, prefHandler as EventListener);
      window.removeEventListener('storage', prefHandler as EventListener);
    };
  }, [ply, setPly, totalPlies]);

  useEffect(() => {
    if (!pliesState) return;
    if (ply < 0) setPly(0);
    else if (ply > totalPlies) setPly(totalPlies);
  }, [pliesState, ply, totalPlies, setPly]);

  if (!pliesState) {
    return (
      <section className="space-y-6">
        <GhostButton onClick={onBack}>← Back to games</GhostButton>
        <p className="font-display-italic text-[15px] text-[color:var(--ink-soft)]">
          {loadingPlies ? 'Loading game…' : 'Could not load moves.'}
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
        brush: getArrowBrushes(arrowTheme)[0] ?? 'blue',
      });
    }
  }

  const orientation = game.deviation.playedAs;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <GhostButton onClick={onBack}>← Back to games</GhostButton>
        <div className="flex flex-wrap items-center gap-3">
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
          {!readOnly && shareId ? (
            <ShareDialog
              resourceType="analysis"
              resourceId={shareId}
              title={`${game.whiteUsername} vs ${game.blackUsername}`}
            />
          ) : !readOnly ? (
            <button
              type="button"
              disabled={sharePending}
              onClick={() => {
                const fd = new FormData();
                fd.set('source', game.source);
                fd.set('gameId', game.gameId);
                fd.set('url', game.url ?? '');
                fd.set('whiteUsername', game.whiteUsername);
                fd.set('blackUsername', game.blackUsername);
                fd.set('result', game.result);
                fd.set('playedAt', String(new Date(game.playedAt).getTime()));
                fd.set('opening', game.opening ?? '');
                fd.set('timeControl', game.timeControl ?? '');
                fd.set('pgn', game.pgn);
                fd.set('playedAs', game.deviation.playedAs);
                fd.set('deviationKind', game.deviation.kind);
                fd.set('deviationMoveNumber', String(game.deviation.deviationMoveNumber ?? ''));
                fd.set('deviationPly', String(game.deviation.deviationPly ?? ''));
                fd.set('playedSan', game.deviation.playedSan ?? '');
                fd.set('expectedSans', (game.deviation.expectedSans ?? []).join('\n'));
                fd.set('deviationFen', game.deviation.deviationFen ?? '');
                fd.set('totalPlies', String(game.deviation.totalPlies));
                startShare(async () => {
                  const stored = await ensureAnalyzedGameStored(fd);
                  setShareId(stored.id);
                });
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.13em] text-[color:var(--ink)] transition-colors hover:border-[color:var(--library-green)] hover:bg-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharePending ? 'Preparing...' : 'Share'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[auto_minmax(280px,1fr)]">
        <div>
          <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Diagram
            </p>
            <div className="flex items-baseline gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
                {ply === 0 ? 'starting' : `${ply} ply`}
              </p>
              <button
                type="button"
                onClick={() => setShowHighlights((s) => !s)}
                aria-pressed={showHighlights}
                className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] underline decoration-1 underline-offset-[6px] transition-colors duration-200 ${
                  showHighlights
                    ? 'text-[color:var(--margin-red)] decoration-[color:var(--margin-red)]'
                    : 'text-[color:var(--ink-faint)] decoration-[color:var(--paper-edge)] hover:text-[color:var(--ink)]'
                }`}
                title="Toggle move highlights (h)"
              >
                Hints {showHighlights ? 'on' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => setShowArrows((s) => !s)}
                aria-pressed={showArrows}
                className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] underline decoration-1 underline-offset-[6px] transition-colors duration-200 ${
                  showArrows
                    ? 'text-[color:var(--margin-red)] decoration-[color:var(--margin-red)]'
                    : 'text-[color:var(--ink-faint)] decoration-[color:var(--paper-edge)] hover:text-[color:var(--ink)]'
                }`}
                title="Toggle deviation arrows (v)"
              >
                Arrows {showArrows ? 'on' : 'off'}
              </button>
            </div>
          </div>
          <ResizableDiagramFrame>
            <ChessBoard
              fen={fen}
              orientation={orientation}
              lastMove={showHighlights ? lastMove : undefined}
              viewOnly
              arrows={showArrows ? arrows : []}
              brushes={getBoardBrushes(arrowTheme)}
            />
          </ResizableDiagramFrame>
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
          <p className="mt-3 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)] md:block">
            <kbd className="font-mono">v</kbd> arrows · <kbd className="font-mono">h</kbd> hints
          </p>

          {/* Annotation — narrow screens only: right below nav controls */}
          <section className="mt-4 md:hidden">
            <div className="flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Annotation
              </p>
              {!readOnly && (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]">
                  {annotationSaved ? 'Saved' : 'Autosave'}
                </span>
              )}
            </div>
            {!readOnly ? (
              <textarea
                value={annotationsByPly[ply] ?? ''}
                onChange={(e) => {
                  const text = e.target.value;
                  setAnnotationSaved(false);
                  setAnnotationsByPly((prev) => {
                    const next = { ...prev };
                    if (text.trim()) next[ply] = text;
                    else delete next[ply];
                    return next;
                  });
                }}
                placeholder="Position annotation (auto-saved)"
                rows={3}
                className="mt-3 w-full border border-[color:var(--paper-edge)] bg-transparent px-3 py-2 text-[14px] text-[color:var(--ink)] outline-none transition-colors duration-150 focus:border-[color:var(--ink)]"
              />
            ) : annotationsByPly[ply] ? (
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
                {annotationsByPly[ply]}
              </p>
            ) : (
              <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
                No annotation.
              </p>
            )}
          </section>
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

          <MoveList plies={pliesState} ply={ply} setPly={setPly} deviationPly={game.deviation.deviationPly} annotationsByPly={annotationsByPly} />

          {/* Annotation — wide screens only */}
          <section className="hidden md:block">
            <div className="flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Annotation
              </p>
              {!readOnly && (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]">
                  {annotationSaved ? 'Saved' : 'Autosave'}
                </span>
              )}
            </div>
            {!readOnly ? (
              <textarea
                value={annotationsByPly[ply] ?? ''}
                onChange={(e) => {
                  const text = e.target.value;
                  setAnnotationSaved(false);
                  setAnnotationsByPly((prev) => {
                    const next = { ...prev };
                    if (text.trim()) next[ply] = text;
                    else delete next[ply];
                    return next;
                  });
                }}
                placeholder="Position annotation (auto-saved)"
                rows={3}
                className="mt-3 w-full border border-[color:var(--paper-edge)] bg-transparent px-3 py-2 text-[14px] text-[color:var(--ink)] outline-none transition-colors duration-150 focus:border-[color:var(--ink)]"
              />
            ) : annotationsByPly[ply] ? (
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
                {annotationsByPly[ply]}
              </p>
            ) : (
              <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
                No annotation.
              </p>
            )}
          </section>

          {!readOnly && <section className="border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-5 py-4">
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
              <div className="flex flex-wrap items-center gap-3">
                <PremiumButton
                  onClick={() => {
                    setImportMessage(null);
                    const fd = new FormData();
                    fd.set('pgn', game.pgn);
                    fd.set('playedAs', game.deviation.playedAs);
                    fd.set('chapterName', chapterName.trim());
                    fd.set('annotationsByPly', JSON.stringify(annotationsByPly));
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
          </section>}
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
  annotationsByPly,
}: {
  plies: { san: string }[];
  ply: number;
  setPly: (p: number) => void;
  deviationPly?: number;
  annotationsByPly?: Record<number, string>;
}) {
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [ply]);

  const tokens = plies.map((p, i) => {
    const moveNumber = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const prefix = isWhite ? `${moveNumber}.` : '';
    const tokenPly = i + 1;
    return {
      key: `${i}-${p.san}`,
      text: `${prefix}${p.san}`,
      ply: tokenPly,
      hasAnnotation: !!(annotationsByPly?.[tokenPly]),
    };
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
              ref={ply === t.ply ? activeButtonRef : undefined}
              active={ply === t.ply}
              deviation={t.ply === deviationPly}
              hasAnnotation={t.hasAnnotation}
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

const PlyButton = React.forwardRef<
  HTMLButtonElement,
  {
    active?: boolean;
    deviation?: boolean;
    hasAnnotation?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }
>(function PlyButton({ active, deviation, hasAnnotation, onClick, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 ${
        active
          ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]'
          : deviation
            ? 'bg-transparent text-[color:var(--margin-red)] hover:bg-[color:var(--paper-edge)]'
            : hasAnnotation
              ? 'bg-[color:var(--library-green)]/15 text-[color:var(--library-green)] hover:bg-[color:var(--library-green)]/25'
              : 'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'
      }`}
    >
      {children}
    </button>
  );
});
