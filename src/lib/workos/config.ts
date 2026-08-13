const trimTrailingSlash = (value: string) => value.trim().replace(/\/$/, '');

export function getCanonicalSiteUrl() {
  const siteUrl = process.env.SITE_URL?.trim();
  return siteUrl ? trimTrailingSlash(siteUrl) : undefined;
}

export function getWorkOSRedirectUri() {
  const configuredRedirectUri = process.env.WORKOS_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  const siteUrl = getCanonicalSiteUrl();
  return siteUrl ? `${siteUrl}/auth/callback` : undefined;
}
