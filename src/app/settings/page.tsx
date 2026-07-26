import { SettingsForm } from './SettingsForm';
import { DataPanel } from './DataPanel';
import { BookMethodSettings } from './BookMethodSettings';
import { AppSurface, PageHeader, PremiumPanel } from '@/components/ui/Premium';

export default async function SettingsPage() {

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Appendix — Settings"
        title={
          <>
            The <span className="font-display-italic">colophon</span>.
          </>
        }
        body="Account preferences and connected chess platforms. Settings here power features like Analyze."
      />

      <nav
        aria-label="Settings sections"
        className="mb-10 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]"
      >
        <a className="hover:text-[color:var(--ink)]" href="#accounts">
          · Accounts
        </a>
        <a className="hover:text-[color:var(--ink)]" href="#book-methods">
          · Book methods
        </a>
        <a className="hover:text-[color:var(--ink)]" href="#data">
          · Other settings & export
        </a>
      </nav>

      <section
        id="accounts"
        aria-labelledby="accounts-heading"
        className="mb-12 scroll-mt-24"
      >
        <header className="mb-5">
          <h2
            id="accounts-heading"
            className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl"
          >
            Accounts
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
            Connect chess accounts so RepDrill can pull your recent games and mark each departure
            from preparation.
          </p>
        </header>

        <PremiumPanel className="max-w-2xl" innerClassName="px-6 py-7 md:px-8 md:py-8">
          <SettingsForm />
        </PremiumPanel>
      </section>

      <section
        id="book-methods"
        aria-labelledby="book-methods-heading"
        className="mb-12 scroll-mt-24"
      >
        <header className="mb-5">
          <h2
            id="book-methods-heading"
            className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl"
          >
            Book training methods
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
            RepDrill follows each book’s recommended cadence by default. Turn either method off
            in one click to restore random access and train without cycle guidance.
          </p>
        </header>
        <PremiumPanel className="max-w-3xl" innerClassName="px-6 py-7 md:px-8 md:py-8">
          <BookMethodSettings />
        </PremiumPanel>
      </section>

      <section id="data" aria-labelledby="data-heading" className="scroll-mt-24">
        <header className="mb-5">
          <h2
            id="data-heading"
            className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl"
          >
            Other settings & export
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
            Import courses, export your library, and manage your stored data.
          </p>
        </header>
        <DataPanel />
      </section>
    </AppSurface>
  );
}
