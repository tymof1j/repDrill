import { authkitProxy } from '@workos-inc/authkit-nextjs';
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { courseAliasRedirectUrl, resolveCourseHostAlias } from "@/lib/course/hostAliases";

const workosProxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      '/',
      '/login',
      '/comparison',
      '/documentation/:path*',
      '/share/:path*',
      '/sign-in',
      '/auth/:path*',
      '/api/source-documents/:path*',
      '/api/internal/counter-refresh',
    ],
  },
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const courseAlias = request.nextUrl.pathname === "/"
    ? resolveCourseHostAlias(request.nextUrl.hostname)
    : null;

  if (courseAlias) {
    // A redirect makes the canonical app host own auth cookies and ensures the
    // protected destination is evaluated on a fresh request.
    return NextResponse.redirect(courseAliasRedirectUrl(courseAlias, request.nextUrl));
  }
  return workosProxy(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
