// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Chess } from 'chess.js';
import type { TrainingLine } from '../src/app/train/types';
const mocks = vi.hoisted(() => ({ enqueue: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/training/ProgressSync', () => ({ useProgressSync: () => ({ enqueue: mocks.enqueue, pending: 99, syncing: true }) }));
vi.mock('next/dynamic', () => ({ default: () => function Board({ onMove, viewOnly }: { onMove: (a: string, b: string) => void; viewOnly: boolean }) {
  return <button disabled={viewOnly} onClick={() => onMove('e2', 'e4')}>Play e4</button>;
} }));
vi.mock('@/components/board/ResizableDiagramFrame', () => ({ ResizableDiagramFrame: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
import { TrainingSession } from '../src/app/train/TrainingSession';
function line(id: string, puzzles = false): TrainingLine {
  const chess = new Chess(); const parentFen = chess.fen(); chess.move('e4');
  return { lineId: id, courseId: 'course', chapterId: id, lineKey: 'e2e4', courseName: 'Test', chapterName: id,
    courseColor: 'white', isNew: false, dueCount: 1, isInfoOnly: false, trainingMode: puzzles ? 'puzzles' : 'theory',
    steps: [{ parentFen, childFen: chess.fen(), parentPositionId: 'p', childPositionId: 'q', san: 'e4', uci: 'e2e4',
      moveNumber: 1, isUserMove: true, annotation: null, cardId: puzzles ? null : id, isNew: false }] };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('advances while saves are pending and never scores the next puzzle before it is played', () => {
  render(<TrainingSession initialLines={[line('one', true), line('two', true)]} />);
  fireEvent.click(screen.getByText('Play e4'));
  expect(mocks.enqueue).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /Next line/ }));
  expect(mocks.enqueue).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Finish session' })).toBeNull();
  fireEvent.click(screen.getByText('Play e4'));
  expect(mocks.enqueue).toHaveBeenCalledTimes(2);
  expect(mocks.enqueue.mock.calls.map(([event]) => event.chapterId)).toEqual(['one', 'two']);
  fireEvent.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(mocks.enqueue).toHaveBeenCalledTimes(2);
});
it('records a shared memory card only once and exits without waiting for the server', () => {
  const first = line('one'); const second = line('two'); second.steps[0].cardId = first.steps[0].cardId;
  render(<TrainingSession initialLines={[first, second]} />);
  fireEvent.click(screen.getByText('Play e4'));
  fireEvent.click(screen.getByRole('button', { name: /Next line/ }));
  fireEvent.click(screen.getByText('Play e4'));
  expect(mocks.enqueue).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /Save & exit/ }));
  expect(mocks.push).toHaveBeenCalledWith('/courses');
});
