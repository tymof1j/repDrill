import { useCallback, useEffect, useMemo, useState } from 'react';

export type NavMove = {
  id: string;
  parentPositionId: string;
  childPositionId: string;
  san: string;
  uci: string;
  moveNumber: number;
  colorToMove: 'white' | 'black';
  isMainLine: boolean;
};

function moveBranchKey(move: NavMove) {
  return `${move.parentPositionId}:${move.childPositionId}:${move.uci}`;
}

function uniqueBranches<M extends NavMove>(moves: M[]) {
  const seen = new Set<string>();
  const unique: M[] = [];
  for (const move of moves) {
    const key = moveBranchKey(move);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(move);
  }
  return unique;
}

export function useTreeNavigation<M extends NavMove>(
  rootPositionId: string,
  moves: M[],
) {
  const movesByParentRaw = useMemo(() => {
    const map = new Map<string, M[]>();
    for (const m of moves) {
      const arr = map.get(m.parentPositionId) ?? [];
      arr.push(m);
      map.set(m.parentPositionId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine));
    }
    return map;
  }, [moves]);

  const movesByParent = useMemo(() => {
    const map = new Map<string, M[]>();
    for (const [parentId, children] of movesByParentRaw) {
      map.set(parentId, uniqueBranches(children));
    }
    return map;
  }, [movesByParentRaw]);

  const [path, setPath] = useState<M[]>([]);

  const currentPositionId =
    path.length > 0 ? path[path.length - 1].childPositionId : rootPositionId;

  const nextMoves = movesByParent.get(currentPositionId) ?? [];
  const rawNextMoves = movesByParentRaw.get(currentPositionId) ?? [];

  const lastMove: [string, string] | undefined = (() => {
    const last = path[path.length - 1];
    if (!last) return undefined;
    return [last.uci.slice(0, 2), last.uci.slice(2, 4)];
  })();

  const goRoot = useCallback(() => setPath([]), []);
  const goBack = useCallback(() => setPath((p) => p.slice(0, -1)), []);
  const goToIndex = useCallback(
    (i: number) => setPath((p) => p.slice(0, i + 1)),
    [],
  );
  const playMove = useCallback((m: M) => setPath((p) => [...p, m]), []);

  const goForward = useCallback(() => {
    const children = movesByParent.get(currentPositionId);
    if (children && children.length > 0) {
      playMove(children[0]);
    }
  }, [currentPositionId, movesByParent, playMove]);

  const goEnd = useCallback(() => {
    let posId = currentPositionId;
    const extension: M[] = [];
    for (;;) {
      const children = movesByParent.get(posId);
      if (!children || children.length === 0) break;
      const next = children[0];
      extension.push(next);
      posId = next.childPositionId;
    }
    if (extension.length > 0) {
      setPath((p) => [...p, ...extension]);
    }
  }, [currentPositionId, movesByParent]);

  const cycleSibling = useCallback(
    (direction: 1 | -1) => {
      if (path.length === 0) return;
      const current = path[path.length - 1];
      const parentId = current.parentPositionId;
      const siblings = movesByParent.get(parentId) ?? [];
      if (siblings.length <= 1) return;
      const idx = siblings.findIndex((m) => m.id === current.id);
      const next = (idx + direction + siblings.length) % siblings.length;
      setPath((p) => [...p.slice(0, -1), siblings[next]]);
    },
    [path, movesByParent],
  );

  const selectBranch = useCallback(
    (n: number) => {
      const children = movesByParent.get(currentPositionId);
      if (!children || n < 1 || n > children.length) return;
      playMove(children[n - 1]);
    },
    [currentPositionId, movesByParent, playMove],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          cycleSibling(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          cycleSibling(1);
          break;
        case 'Home':
          e.preventDefault();
          goRoot();
          break;
        case 'End':
          e.preventDefault();
          goEnd();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            selectBranch(parseInt(e.key, 10));
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goBack, goForward, cycleSibling, goRoot, goEnd, selectBranch]);

  const jumpToPosition = useCallback(
    (targetId: string) => {
      if (targetId === rootPositionId) {
        setPath([]);
        return;
      }
      const parentOf = new Map<string, M>();
      for (const m of moves) {
        if (!parentOf.has(m.childPositionId)) {
          parentOf.set(m.childPositionId, m);
        }
      }
      const trail: M[] = [];
      let cur = targetId;
      while (cur !== rootPositionId && parentOf.has(cur)) {
        const m = parentOf.get(cur)!;
        trail.unshift(m);
        cur = m.parentPositionId;
      }
      if (trail.length > 0) {
        setPath(trail);
      }
    },
    [rootPositionId, moves],
  );

  return {
    path,
    setPath,
    currentPositionId,
    nextMoves,
    rawNextMoves,
    lastMove,
    movesByParent,
    movesByParentRaw,
    goRoot,
    goBack,
    goForward,
    goEnd,
    goToIndex,
    playMove,
    cycleSibling,
    selectBranch,
    jumpToPosition,
  };
}
