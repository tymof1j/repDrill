import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { normalizeLanguage } from '@/lib/i18n/translations';
import { cookies } from 'next/headers';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { SpeedInsights } from "@vercel/speed-insights/next";

const fixelDisplay = localFont({
  src: './fonts/FixelDisplay-SemiBold.otf',
  variable: '--font-fixel-display',
  display: 'swap',
});

const kyivTypeSans = localFont({
  src: './fonts/KyivTypeSans-Regular2.ttf',
  variable: '--font-kyiv-type',
  display: 'swap',
});

const blad = localFont({
  src: './fonts/Blad-Regular.otf',
  variable: '--font-blad',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RepDrill — Remember the Chess You Study',
  description:
    'Turn chess books, opening files, and real games into focused position training you can remember over the board.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get('repdrill-language')?.value);
  const auth = await withAuth();
  const { accessToken: _accessToken, ...initialAuth } = auth;

  return (
    <html
        lang={initialLanguage}
        data-scroll-behavior="smooth"
        suppressHydrationWarning
        className={`${fixelDisplay.variable} ${kyivTypeSans.variable} ${blad.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var s=localStorage.getItem('repdrill-theme');var t=(s==='evening'||s==='morning')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'evening':'morning');if(t==='evening')document.documentElement.setAttribute('data-theme','evening');}catch(e){}})();`,
            }}
          />
        </head>
      <body className="min-h-full text-[color:var(--ink)]">
          <AuthKitProvider initialAuth={initialAuth}>
            <I18nProvider initialLanguage={initialLanguage}>
              <AppShell sidebar={<Sidebar />}>{children}</AppShell>
            </I18nProvider>
            <SpeedInsights />
          </AuthKitProvider>
      </body>
    </html>
  );
}
