'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// ─── Search index ──────────────────────────────────────────────────────────
const DOC_SEARCH_INDEX = [
  {
    href: '/documentation',
    page: 'FAQ',
    title: 'How RepDrill works',
    snippets: [
      'keyboard shortcuts FAQ topics workspace navigation',
      'Switch between board input notation tab Enter submit',
      'Back forward arrow keys cycle sibling branches up down',
      'Jump numbered branch 1-9 Home End root deepest',
      'Show hide branch arrows V Search annotations slash',
      'Move notation two styles SAN Short spaced repetition FSRS',
      'RepDrill advantages position-first repertoire memory transpositions',
      'FSRS review real-game repair Lichess Chess.com deviation finder',
      'Merged repertoires sharing courses chapters lines analyzed games portable PGN JSON',
    ],
  },
  {
    href: '/documentation/import-behavior',
    page: 'Import behavior',
    title: 'PGN naming and info-only mode',
    snippets: [
      'PGN chapter naming fallback ChapterName Event filename when headers are missing',
      'info-only mode detection ideas games in filename headers comments',
      'manual chapter line info-only toggle training scheduling',
      'learn tab one-time view no FSRS memorization for info-only lines',
      'learn review order due lines new lines tie breaks chapter order after import',
    ],
  },
  {
    href: '/documentation/learn-order',
    page: 'Learn order',
    title: 'What is the order of lines in Learn mode?',
    snippets: [
      'learn review line order due new priority',
      'selection includes due now or new cards',
      'info-only one-time view items hidden after viewed',
      'chapter reorder within 10 minutes after import used as tie-breaker',
    ],
  },
  {
    href: '/documentation/notation',
    page: 'Notation',
    title: 'Move notation',
    snippets: [
      'Standard Algebraic Notation SAN chess books databases tournament records',
      'Rxb7+ gxf7+ Qh5# Nf3 capture check checkmate x plus hash',
      'Short Notation compact pawn capture origin destination file gf Rb7',
      'Disambiguation Nbd2 R1e1 Rab7 two pieces same square',
      'English piece letters K king Q queen R rook B bishop N knight',
      'Invalid mixed forms Rxb7 Rb7+ gxf7 Conversion rule exactly one format',
    ],
  },
  {
    href: '/documentation/spaced-repetition',
    page: 'Spaced repetition',
    title: 'Why spaced repetition',
    snippets: [
      'spaced repetition recall spacing memory retention opening lines',
      'beats re-reading bulk drilling long-term forgetting curve review schedule',
    ],
  },
  {
    href: '/documentation/fsrs',
    page: 'FSRS',
    title: 'Why FSRS',
    snippets: [
      'FSRS Free Spaced Repetition Scheduler algorithm SM-2 Anki interval',
      'stability difficulty elapsed days lapses reps review cards',
    ],
  },
];

type SearchResult = { href: string; page: string; title: string; matchedSnippet: string };

function fuzzySearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];
  for (const entry of DOC_SEARCH_INDEX) {
    const text = [entry.page, entry.title, ...entry.snippets].join(' ').toLowerCase();
    if (!words.every((w) => text.includes(w))) continue;
    const bestSnippet = entry.snippets.find((s) => words.some((w) => s.toLowerCase().includes(w))) ?? entry.title;
    results.push({ href: entry.href, page: entry.page, title: entry.title, matchedSnippet: bestSnippet });
  }
  return results;
}

// ─── Search widget (reusable) ──────────────────────────────────────────────
function DocSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setResults(fuzzySearch(q));
  }, []);

  return (
    <div>
      <div className="relative">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--ink-faint)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search docs…"
          aria-label="Search documentation"
          className="w-full rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] py-2 pl-8 pr-3 font-mono text-[11px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-ghost)] outline-none transition-colors duration-200 focus:border-[color:var(--library-green)] focus:ring-1 focus:ring-[color:var(--library-green)]/20"
        />
      </div>
      {query.trim() && (
        <div className="mt-2 overflow-hidden rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)]">
          {results.length === 0 ? (
            <p className="px-3 py-3 font-mono text-[10px] text-[color:var(--ink-faint)]">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.href} className="border-b border-[color:var(--paper-rule)] last:border-b-0">
                  <Link
                    href={r.href}
                    onClick={() => { setQuery(''); setResults([]); onNavigate?.(); }}
                    className="block px-3 py-2.5 transition-colors duration-150 hover:bg-[color:var(--surface-soft)]"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--library-green)]">{r.page}</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[color:var(--ink)]">{r.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[color:var(--ink-soft)]">{r.matchedSnippet}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Nav data ──────────────────────────────────────────────────────────────
const docNav = [
  {
    group: 'Start',
    items: [{ href: '/documentation', label: 'FAQ' }],
  },
  {
    group: 'Topics',
    items: [
      { href: '/documentation/import-behavior', label: 'PGN import behavior' },
      { href: '/documentation/learn-order', label: 'Learn line order' },
      { href: '/documentation/notation', label: 'Move notation' },
      { href: '/documentation/spaced-repetition', label: 'Spaced repetition' },
      { href: '/documentation/fsrs', label: 'FSRS scheduler' },
    ],
  },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="FAQ">
      {docNav.map((section) => (
        <div key={section.group} className="mb-5">
          <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150 ${
                      active
                        ? 'bg-[color:var(--library-green)]/10 font-semibold text-[color:var(--library-green)]'
                        : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────
function NavSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden border-r border-[color:var(--paper-rule)] bg-[color:var(--surface)]/70 lg:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto px-8 py-7">
        <Link href="/documentation" className="mb-7 flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--ink)] text-[10px] font-bold text-[color:var(--paper)]">R</span>
          <span>
            <span className="block text-[13px] font-semibold leading-tight text-[color:var(--ink)]">RepDrill</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">FAQ</span>
          </span>
        </Link>
        <Link
          href="/courses"
          className="mb-6 inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink)] transition-colors duration-200 hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
        >
          Back to app
        </Link>
        <div className="mb-6">
          <DocSearch />
        </div>
        <NavLinks pathname={pathname} />
      </div>
    </aside>
  );
}

// ─── Mobile nav panel (Spogo-style) ───────────────────────────────────────
function MobileDocNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      {/* Panel — slides in from left */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(85vw,22rem)] overflow-y-auto border-r border-[color:var(--paper-rule)] bg-[color:var(--surface)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-[color:var(--paper-rule)] px-5 py-4">
          <Link href="/documentation" onClick={onClose} className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--ink)] text-[10px] font-bold text-[color:var(--paper)]">R</span>
            <span>
              <span className="block text-[13px] font-semibold leading-tight text-[color:var(--ink)]">RepDrill</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">FAQ</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-8 w-8 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--ink)]"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel body */}
        <div className="space-y-6 p-5">
          <Link
            href="/courses"
            onClick={onClose}
            className="flex min-h-9 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink)] transition-colors hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)]"
          >
            Back to app
          </Link>
          <DocSearch onNavigate={onClose} />
          <NavLinks pathname={pathname} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}

// ─── On this page (desktop) ────────────────────────────────────────────────
function useActiveSection(sections: { id: string; label: string }[]) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0.1, 0.25, 0.5, 0.75] },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);
  return sections.some((s) => s.id === activeId) ? activeId : sections[0]?.id ?? '';
}

function OnThisPage({ sections }: { sections: { id: string; label: string }[] }) {
  const activeId = useActiveSection(sections);
  if (sections.length === 0) return null;
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-0 h-screen overflow-y-auto px-7 py-10">
        <p className="mb-4 text-[12px] font-semibold text-[color:var(--ink-faint)]">On this page</p>
        <ul className="space-y-1 border-l border-[color:var(--paper-rule)]">
          {sections.map((s) => {
            const active = activeId === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active ? 'location' : undefined}
                  className={`block border-l-2 py-1 pl-3 text-[12px] leading-snug transition-colors duration-150 ${
                    active
                      ? 'border-[color:var(--library-green)] font-semibold text-[color:var(--library-green)]'
                      : 'border-transparent text-[color:var(--ink-soft)] hover:border-[color:var(--library-green)] hover:text-[color:var(--ink)]'
                  }`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────
export function DocLayout({
  children,
  sections = [],
}: {
  children: ReactNode;
  sections?: { id: string; label: string }[];
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Find current page label for mobile header
  const currentPage = docNav.flatMap((s) => s.items).find((i) => i.href === pathname)?.label ?? 'FAQ';

  return (
    <div className="relative min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <MobileDocNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_16rem]">
        <NavSidebar />

        <article className="min-w-0 px-5 pb-20 pt-5 md:px-10 lg:px-14 lg:pt-14 xl:flex xl:justify-center">
          {/* Mobile top bar */}
          <div className="mb-8 flex items-center justify-between gap-3 border-b border-[color:var(--paper-rule)] pb-4 lg:hidden">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">RepDrill</p>
              <p className="mt-0.5 text-[15px] font-semibold text-[color:var(--ink)]">{currentPage}</p>
            </div>
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-soft)] transition-colors hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
          </div>

          <div className="mx-auto w-full max-w-[46rem] xl:mx-0">{children}</div>
        </article>

        <OnThisPage sections={sections} />
      </div>
    </div>
  );
}
