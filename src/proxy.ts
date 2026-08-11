import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import { courseAliasRedirectUrl, resolveCourseHostAlias } from "@/lib/course/hostAliases";

const isSignInPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher([
  "/courses(.*)",
  "/repertoires(.*)",
  "/train(.*)",
  "/analyze(.*)",
  "/settings(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const courseAlias = request.nextUrl.pathname === "/"
    ? resolveCourseHostAlias(request.nextUrl.hostname)
    : null;

  if (courseAlias) {
    // A redirect makes the canonical app host own auth cookies and ensures the
    // protected destination is evaluated on a fresh request.
    return NextResponse.redirect(courseAliasRedirectUrl(courseAlias, request.nextUrl));
  }

  const isAuthenticated = await convexAuth.isAuthenticated();
  if (isSignInPage(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/courses");
  }
  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
