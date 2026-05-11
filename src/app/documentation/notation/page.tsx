import type { Metadata } from 'next';
import { AppSurface, PageHeader, PremiumPanel } from '@/components/ui/Premium';

export const metadata: Metadata = {
  title: 'Notation — Documentation · RepDrill',
  description:
    'Which move notations the keyboard input accepts: Standard Algebraic Notation (SAN) and Short Notation. English piece letters only.',
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="notation rounded-sm bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[0.92em] text-[color:var(--ink)]">
      {children}
    </code>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-7 mb-3 font-display text-lg font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
      {children}
    </h3>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:text-base">
      {children}
    </p>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:text-base">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--paper-edge)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ComparisonTable({
  rows,
  headers,
}: {
  rows: [React.ReactNode, React.ReactNode][];
  headers: [string, string];
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-md border border-[color:var(--paper-rule)]">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[color:var(--surface-soft)]">
          <tr>
            <th className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              {headers[0]}
            </th>
            <th className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              {headers[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-transparent even:bg-[color:var(--surface-soft)]/40">
              <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 text-[color:var(--ink)] last:border-b-0">
                {row[0]}
              </td>
              <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 text-[color:var(--ink)] last:border-b-0">
                {row[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NotationFaqPage() {
  return (
    <AppSurface>
      <PageHeader
        eyebrow="Documentation — Notation"
        title={
          <>
            How to <span className="font-display-italic">type</span> a move.
          </>
        }
        body="The keyboard input accepts two notation styles. Anything else — including mixed forms or non-English piece letters — will be rejected as an invalid move."
      />

      <PremiumPanel className="mb-10" innerClassName="px-6 py-7 md:px-10 md:py-9">
        <Para>
          When you use the <strong>Notation</strong> input mode in training, your move must match
          exactly one of the two forms below. The validator does <em>not</em> guess intent — partial
          omissions are treated as invalid.
        </Para>

        <SectionTitle>1. Standard Algebraic Notation (SAN)</SectionTitle>
        <Para>
          The conventional notation used in books, databases, and tournament records.
        </Para>

        <SubTitle>Examples</SubTitle>
        <List
          items={[
            <Code>Rxb7+</Code>,
            <Code>gxf7+</Code>,
            <Code>Qh5#</Code>,
            <Code>Nf3</Code>,
          ]}
        />

        <SubTitle>Features</SubTitle>
        <List
          items={[
            <>
              <Code>x</Code> indicates a capture.
            </>,
            <>
              <Code>+</Code> indicates check.
            </>,
            <>
              <Code>#</Code> indicates checkmate.
            </>,
            <>The full destination square is always included.</>,
            <>
              Standard SAN disambiguation rules apply when two or more identical pieces can move to
              the same square.
            </>,
          ]}
        />

        <SubTitle>Disambiguation examples</SubTitle>
        <List
          items={[
            <>
              <Code>Nbd2</Code> — the knight from the b-file moves to d2.
            </>,
            <>
              <Code>R1e1</Code> — the rook from rank 1 moves to e1.
            </>,
            <>
              <Code>Qh4e1</Code> — when full disambiguation is required.
            </>,
          ]}
        />

        <SectionTitle>2. Short Notation</SectionTitle>
        <Para>A compact notation designed to reduce the number of characters.</Para>

        <SubTitle>Rules</SubTitle>
        <List
          items={[
            <>
              <Code>x</Code> is omitted.
            </>,
            <>
              <Code>+</Code> and <Code>#</Code> are omitted.
            </>,
            <>For pawn captures, only the origin and destination files are written.</>,
            <>For all other moves, use the piece letter followed by the destination square.</>,
            <>SAN disambiguation rules are preserved exactly as in Standard Algebraic Notation.</>,
          ]}
        />

        <SubTitle>Examples</SubTitle>
        <ComparisonTable
          headers={['Standard SAN', 'Short Notation']}
          rows={[
            [<Code>Rxb7+</Code>, <Code>Rb7</Code>],
            [<Code>Rxb7#</Code>, <Code>Rb7</Code>],
            [<Code>gxf7+</Code>, <Code>gf</Code>],
            [<Code>gxh8=Q#</Code>, <Code>gh=Q</Code>],
            [<Code>Nf3</Code>, <Code>Nf3</Code>],
            [<Code>Nbd2</Code>, <Code>Nbd2</Code>],
            [<Code>R1e1+</Code>, <Code>R1e1</Code>],
          ]}
        />

        <SectionTitle>Conversion rule</SectionTitle>
        <Para>Each move must be written in exactly one of two formats:</Para>
        <List
          items={[
            <>
              <strong>Standard Algebraic Notation (SAN)</strong> — includes all notation symbols.
            </>,
            <>
              <strong>Short Notation</strong> — omits <Code>x</Code>, <Code>+</Code>, and{' '}
              <Code>#</Code> together.
            </>,
          ]}
        />
        <Para>
          Partial omission is <strong>not allowed</strong>.
        </Para>

        <SectionTitle>Invalid mixed forms</SectionTitle>
        <List
          items={[
            <>
              <Code>Rxb7</Code> — omits <Code>+</Code> but keeps <Code>x</Code>.
            </>,
            <>
              <Code>Rb7+</Code> — omits <Code>x</Code> but keeps <Code>+</Code>.
            </>,
            <>
              <Code>gxf7</Code> — omits <Code>+</Code> but keeps <Code>x</Code>.
            </>,
            <>
              <Code>gf7+</Code> — mixed notation.
            </>,
          ]}
        />

        <SectionTitle>Valid forms</SectionTitle>
        <List
          items={[
            <>
              <Code>Rxb7+</Code> — SAN.
            </>,
            <>
              <Code>Rb7</Code> — Short.
            </>,
            <>
              <Code>gxf7+</Code> — SAN.
            </>,
            <>
              <Code>gf</Code> — Short.
            </>,
          ]}
        />

        <SectionTitle>Important note on disambiguation</SectionTitle>
        <Para>
          This specification does <strong>not</strong> override standard SAN disambiguation rules.
          If two or more identical pieces can legally move to the same square, the move must include
          the required file, rank, or both. This requirement applies in both Standard Algebraic
          Notation and Short Notation.
        </Para>
        <div className="mt-5 overflow-hidden rounded-md border border-[color:var(--paper-rule)]">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[color:var(--surface-soft)]">
              <tr>
                <th className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  Situation
                </th>
                <th className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  Standard SAN
                </th>
                <th className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  Short Notation
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 text-[color:var(--ink-soft)]">
                  Two knights can move to d2
                </td>
                <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5"><Code>Nbd2</Code></td>
                <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5"><Code>Nbd2</Code></td>
              </tr>
              <tr className="bg-[color:var(--surface-soft)]/40">
                <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5 text-[color:var(--ink-soft)]">
                  Two rooks can move to e1
                </td>
                <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5"><Code>R1e1+</Code></td>
                <td className="border-b border-[color:var(--paper-rule)] px-4 py-2.5"><Code>R1e1</Code></td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-[color:var(--ink-soft)]">
                  Two rooks can capture b7
                </td>
                <td className="px-4 py-2.5"><Code>Rab7+</Code></td>
                <td className="px-4 py-2.5"><Code>Rab7</Code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <SectionTitle>English piece letters only</SectionTitle>
        <Para>
          Piece letters must be the English standard: <Code>K</Code> king, <Code>Q</Code> queen,{' '}
          <Code>R</Code> rook, <Code>B</Code> bishop, <Code>N</Code> knight. Localized letters
          (e.g. German <Code>S</Code>/<Code>L</Code>, Russian <Code>Кр</Code>/<Code>Ф</Code>) are{' '}
          <strong>not</strong> accepted by the input.
        </Para>

        <SectionTitle>Summary</SectionTitle>
        <List
          items={[
            <>
              <strong>SAN</strong> — full conventional notation.
            </>,
            <>
              <strong>Short Notation</strong> — all optional symbols (<Code>x</Code>,{' '}
              <Code>+</Code>, <Code>#</Code>) omitted together.
            </>,
            <>No hybrid forms are permitted.</>,
            <>All standard SAN disambiguation rules remain fully in effect.</>,
          ]}
        />
      </PremiumPanel>
    </AppSurface>
  );
}
