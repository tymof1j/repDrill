#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const zipPath = process.argv[2];
if (!zipPath || !existsSync(zipPath)) {
  console.error('Usage: node supabase/scripts/inspect-convex-snapshot.mjs <snapshot.zip>');
  process.exit(1);
}

const root = mkdtempSync(join(tmpdir(), 'repdrill-convex-inspect-'));
try {
  execFileSync('unzip', ['-q', zipPath, '-d', root]);
  const rows = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = join(root, entry.name, 'documents.jsonl');
      if (!existsSync(file)) return [entry.name, 0];
      const count = readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
      return [entry.name, count];
    })
    .sort(([a], [b]) => a.localeCompare(b));
  console.log('Convex snapshot contents:');
  for (const [table, count] of rows) console.log(`${String(count).padStart(8)}  ${table}`);
  console.log(`\nTotal documents: ${rows.reduce((sum, [, count]) => sum + count, 0)}`);
  console.log('This is a read-only inspection; no database is contacted.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
