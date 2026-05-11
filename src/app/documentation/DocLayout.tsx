'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const docNav = [
  {
    group: 'Start',
    items: [
      { href: '/documentation', label: 'FAQ' },
    ],
  },
  {
    group: 'Topics',
    items: [
      { href: '/documentation/notation', label: 'Move notation' },
      { href: '/documentation/spaced-repetition', label: 'Spaced repetition' },
      { href: '/documentation/fsrs', label: 'FSRS scheduler' },
    ],
  },
];

function useActiveSection(sections: { id: string; label: string }[]) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      {
        rootMargin: '-18% 0px -62% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sections]);

  return sections.some((section) => section.id === activeId) ? activeId : sections[0]?.id ?? '';
}

function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-[color:var(--paper-rule)] bg-[color:var(--surface)]/70 lg:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto px-8 py-7">
        <Link
          href="/documentation"
          className="mb-7 flex items-center gap-2.5"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--ink)] text-[10px] font-bold text-[color:var(--paper)]">
            R
          </span>
          <span>
            <span className="block text-[13px] font-semibold leading-tight text-[color:var(--ink)]">
              RepDrill
            </span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              FAQ
            </span>
          </span>
        </Link>
        <Link
          href="/courses"
          className="mb-8 inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink)] transition-colors duration-200 hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
        >
          Back to app
        </Link>
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
      </div>
    </aside>
  );
}

function OnThisPage({ sections }: { sections: { id: string; label: string }[] }) {
  const activeId = useActiveSection(sections);

  if (sections.length === 0) return null;
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-0 h-screen overflow-y-auto px-7 py-10">
        <p className="mb-4 text-[12px] font-semibold text-[color:var(--ink-faint)]">
          On this page
        </p>
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

export function DocLayout({
  children,
  sections = [],
}: {
  children: ReactNode;
  sections?: { id: string; label: string }[];
}) {
  return (
    <div className="relative min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_16rem]">
        <NavSidebar />
        <article className="min-w-0 px-5 pb-20 pt-20 md:px-10 lg:px-14 lg:pt-14 xl:flex xl:justify-center">
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <Link
              href="/documentation"
              className="text-[13px] font-semibold text-[color:var(--ink)]"
            >
              RepDrill FAQ
            </Link>
            <Link
              href="/courses"
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink)]"
            >
              Back to app
            </Link>
          </div>
          <div className="mx-auto w-full max-w-[46rem] xl:mx-0">{children}</div>
        </article>
        <OnThisPage sections={sections} />
      </div>
    </div>
  );
}
