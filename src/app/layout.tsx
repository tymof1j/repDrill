import type { Metadata } from 'next';
import { Geist, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { normalizeLanguage } from '@/lib/i18n/translations';
import { cookies } from 'next/headers';
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RepDrill — Chess Opening Memory',
  description:
    'A Convex-backed chess opening repertoire trainer for annotated lines, FSRS recall, game review, and portable PGN/JSON exports.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get('repdrill-language')?.value);

  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang={initialLanguage}
        data-scroll-behavior="smooth"
        suppressHydrationWarning
        className={`${geistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var s=localStorage.getItem('repdrill-theme');var t=(s==='evening'||s==='morning')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'evening':'morning');if(t==='evening')document.documentElement.setAttribute('data-theme','evening');}catch(e){}})();`,
            }}
          />
        </head>
        <body className="min-h-full text-[color:var(--ink)]">
          <ConvexClientProvider>
            <I18nProvider initialLanguage={initialLanguage}>
              <AppShell sidebar={<Sidebar />}>{children}</AppShell>
            </I18nProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
