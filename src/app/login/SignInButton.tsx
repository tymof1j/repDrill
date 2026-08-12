import Link from 'next/link';

export function SignInButton({ href }: { href: string }) {

  return (
    <Link
      href={href}
      className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 text-sm font-semibold text-[color:var(--paper)] shadow-[0_14px_34px_rgba(23,26,23,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)]"
    >
      Continue with WorkOS
      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
