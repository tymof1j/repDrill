import type { Metadata } from 'next';
import { Geist, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';

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
    'A self-hosted chess opening repertoire trainer for annotated lines, FSRS recall, and game review.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
        <AppShell sidebar={<Sidebar />}>{children}</AppShell>
      </body>
    </html>
  );
}
