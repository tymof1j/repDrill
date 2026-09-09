import { describe, expect, it } from 'vitest';
import { buildTrainingQueue } from '../src/lib/training/queue';
const now = Date.now();
function fixture() {
  return { courses: [{ id: 'c', name: 'Course', color: 'white' }], chapters: [{ id: 'ch', course_id: 'c', chapter_type: 'training', sort_order: 0 }],
    moves: [{ id: 'm', chapter_id: 'ch', parent_position_id: 'p', child_position_id: 'q', uci: 'e2e4', san: 'e4', move_type: 'repertoire', is_main_line: true, sort_order: 0 }],
    positions: [{ id: 'p', fen: 'start' }, { id: 'q', fen: 'end' }],
    cards: [{ id: 'rc', move_id: 'm', state: 2, last_review: new Date(now - 86_400_000), due: new Date(now - 1000) }],
    settings: [] as {chapter_id: string; line_key: string; info_only: boolean}[], views: [] };
}
describe('training queue semantics', () => {
  it('uses identical Date/string due semantics', () => {
    const data = fixture();
    expect(buildTrainingQueue(data, {}, now).dueLines).toBe(1);
    const transported = JSON.parse(JSON.stringify(data));
    expect(buildTrainingQueue(transported, {}, now).dueLines).toBe(1);
  });
  it('counts all training lines even when none is currently due', () => {
    const data = fixture(); data.cards[0].due = new Date(now + 86_400_000);
    expect(buildTrainingQueue(data, {}, now)).toMatchObject({ totalLines: 1, dueLines: 0, lines: [] });
  });
  it('respects info-only chapters and explicit line overrides', () => {
    const data = fixture(); data.chapters[0].chapter_type = 'info_only';
    expect(buildTrainingQueue(data, {}, now).lines).toHaveLength(0);
    expect(buildTrainingQueue(data, { learnMode: true }, now).lines[0].isInfoOnly).toBe(true);
    data.settings.push({ chapter_id: 'ch', line_key: 'e2e4', info_only: false });
    expect(buildTrainingQueue(data, {}, now).lines[0].isInfoOnly).toBe(false);
  });
  it('treats missing legacy cards as new, never mastered', () => {
    const data = fixture(); data.cards = [];
    expect(buildTrainingQueue(data, { learnMode: true }, now).lines[0].isNew).toBe(true);
  });
  it('keeps course order in Learn instead of sorting by due count', () => {
    const data = fixture();
    data.moves.push({ ...data.moves[0], id: 'm2', child_position_id: 'r', uci: 'd2d4', san: 'd4', is_main_line: false, sort_order: 1 });
    data.cards = [{ ...data.cards[0], move_id: 'm2' }];
    expect(buildTrainingQueue(data, { learnMode: true }, now).lines.map(line => line.lineKey)).toEqual(['e2e4', 'd2d4']);
  });
  it('retains the full line identity when training from a position', () => {
    const data = fixture();
    data.moves.push({ ...data.moves[0], id: 'm2', parent_position_id: 'q', child_position_id: 'r', uci: 'e7e5', san: 'e5', move_type: 'opponent', sort_order: 1 });
    data.settings.push({ chapter_id: 'ch', line_key: 'e2e4 e7e5', info_only: true });
    const result = buildTrainingQueue(data, { learnMode: true, fromPositionId: 'q' }, now).lines[0];
    expect(result).toMatchObject({ lineKey: 'e2e4 e7e5', isInfoOnly: true });
    expect(result.steps).toHaveLength(1);
  });
});
