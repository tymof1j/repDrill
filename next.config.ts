import type { NextConfig } from "next";

// AuthKit's cookie helper reads the public redirect-URI name. Keep it in sync
// with the canonical server-side setting so deployments that only define
// WORKOS_REDIRECT_URI still get the correct Secure/localhost behavior.
const workosRedirectUri =
  process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI?.trim() ||
  process.env.WORKOS_REDIRECT_URI?.trim();

const nextConfig: NextConfig = {
  ...(workosRedirectUri
    ? { env: { NEXT_PUBLIC_WORKOS_REDIRECT_URI: workosRedirectUri } }
    : {}),
  async rewrites() {
    return [
      {
        source: "/about/:path*",
        destination: "https://tymofii-site.vercel.app/about/:path*",
      },
    ];
  },
};

export default nextConfig;
