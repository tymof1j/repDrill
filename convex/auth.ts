import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Kept only so the legacy Convex source remains type-checkable while WorkOS
  // owns authentication in the migrated application.
  providers: [],
});
