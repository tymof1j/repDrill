import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { AppSurface, Eyebrow, PremiumButton, PremiumPanel } from '@/components/ui/Premium';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/courses');

  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <AppSurface className="flex items-center">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-[1fr_0.82fr]">
        <div>
          <Eyebrow>Private training room</Eyebrow>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-normal text-[#fff8e6] md:text-7xl">
            Sign in to your repertoire.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#b9af98]">
            Open your courses, review due lines, and keep your opening memory in one calm workspace.
          </p>
        </div>

        <PremiumPanel>
          <div className="p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f846d]">
              Authentication
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-[#fff8e6]">Continue with Google</h2>
            <p className="mt-3 text-sm leading-6 text-[#a99f89]">
              RepDrill uses your account to keep course data tied to your own workspace.
            </p>

            {googleConfigured ? (
              <form
                className="mt-8"
                action={async () => {
                  'use server';
                  await signIn('google', { redirectTo: '/courses' });
                }}
              >
                <PremiumButton type="submit" className="w-full">
                  Continue
                </PremiumButton>
              </form>
            ) : (
              <div className="mt-8 rounded-[1.5rem] border border-[#d7b46a]/30 bg-[#d7b46a]/[0.10] p-5 text-sm leading-6 text-[#ead9a5]">
                <p className="font-semibold">Google OAuth not configured</p>
                <p className="mt-2">
                  Set <code className="font-mono">AUTH_GOOGLE_ID</code> and{' '}
                  <code className="font-mono">AUTH_GOOGLE_SECRET</code> in{' '}
                  <code className="font-mono">.env.local</code>, then restart the dev server.
                </p>
              </div>
            )}
          </div>
        </PremiumPanel>
      </div>
    </AppSurface>
  );
}
