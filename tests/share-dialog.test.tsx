// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const query = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ useQuery: query, useMutation: () => vi.fn() }));
vi.mock('@/app/share/actions', () => ({ sendShareInvitationAction: vi.fn() }));
import { ShareDialog } from '../src/components/share/ShareDialog';
afterEach(() => { cleanup(); vi.restoreAllMocks(); query.mockReset(); });
it('does not focus any course card or load share settings when the library mounts', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  render(<>{[1, 2, 3].map(id => <ShareDialog key={id} resourceType="course" resourceId={String(id)} title={`Course ${id}`} />)}</>);
  expect(focus).not.toHaveBeenCalled();
  expect(query.mock.calls.every(([, args]) => args === 'skip')).toBe(true);
});
it('loads sharing only when opened and restores focus without scrolling on close', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  render(<ShareDialog resourceType="course" resourceId="one" title="Course" />);
  fireEvent.click(screen.getByRole('button', { name: /share/i }));
  expect(query.mock.calls.some(([, args]) => args !== 'skip')).toBe(true);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
