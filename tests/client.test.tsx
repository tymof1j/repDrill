// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
const auth = vi.hoisted(() => ({ user: { id: 'alice' } as { id: string } | null, loading: false }));
vi.mock('@workos-inc/authkit-nextjs/components', () => ({ useAuth: () => auth }));
import { callBackend, invalidateQueries, useQueryState } from '../src/lib/supabase/client';
function Query({ operation }: { operation: string }) {
  const { data, error } = useQueryState(operation);
  return <span>{error ? error.message : JSON.stringify(data) ?? 'loading'}</span>;
}
beforeEach(() => { auth.user = { id: crypto.randomUUID() }; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('deduplicates concurrent readers and refreshes after invalidation', async () => {
  const fetchMock = vi.fn(async () => Response.json({ value: 'old' })); vi.stubGlobal('fetch', fetchMock);
  render(<><Query operation="courses.list" /><Query operation="courses.list" /></>);
  await waitFor(() => expect(screen.getAllByText('"old"')).toHaveLength(2));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockImplementation(async () => Response.json({ value: 'new' }));
  act(() => invalidateQueries(['courses.']));
  await waitFor(() => expect(screen.getAllByText('"new"')).toHaveLength(2));
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('never shows cached data from the previous signed-in account', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url, request) => Response.json({ value: JSON.parse(request.body).expectedUserId })));
  auth.user = { id: 'alice-isolation' };
  const { rerender } = render(<Query operation="courses.list" />);
  await screen.findByText('"alice-isolation"');
  auth.user = { id: 'bob-isolation' }; rerender(<Query operation="courses.list" />);
  expect(screen.queryByText('"alice-isolation"')).toBeNull();
  await screen.findByText('"bob-isolation"');
  auth.user = null; rerender(<Query operation="courses.list" />);
  expect(screen.queryByText('"bob-isolation"')).toBeNull();
});
it('reports an expired session response instead of treating login HTML as saved data', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Sign in</html>', { status: 200 })));
  await expect(callBackend('training.syncProgress', {})).rejects.toThrow('Invalid server response');
});
