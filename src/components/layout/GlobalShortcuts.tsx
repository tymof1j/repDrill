'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { navItems } from './SidebarNav';

const shortcutMap = new Map(navItems.map((item) => [item.shortcut.toLowerCase(), item.href]));

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

export function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;

      const href = shortcutMap.get(event.key.toLowerCase());
      if (!href || pathname === href || pathname.startsWith(`${href}/`)) return;

      event.preventDefault();
      router.push(href);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pathname, router]);

  return null;
}
