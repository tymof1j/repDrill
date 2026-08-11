const COURSE_ALIAS_DESTINATIONS = {
  woodpecker: '/courses/woodpecker',
  woodpecker2: '/courses/woodpecker-2',
  english: '/courses/alias/english-breakfast',
  'english-breakfast': '/courses/alias/english-breakfast',
} as const;

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeHostname(value: string | undefined) {
  if (!value) return null;
  const hostname = value.trim().toLowerCase().replace(/\.$/, '');
  return HOSTNAME_PATTERN.test(hostname) ? hostname : null;
}

/** Resolve only an allow-listed, immediate subdomain of the configured root. */
export function resolveCourseHostAlias(
  requestHostname: string,
  configuredRootDomain = process.env.COURSE_ALIAS_ROOT_DOMAIN,
) {
  const hostname = normalizeHostname(requestHostname);
  if (!hostname) return null;

  const rootDomain = normalizeHostname(configuredRootDomain)
    ?? (hostname.endsWith('.localhost') ? 'localhost' : null);
  if (!rootDomain) return null;

  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  const label = hostname.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null;

  return COURSE_ALIAS_DESTINATIONS[label as keyof typeof COURSE_ALIAS_DESTINATIONS] ?? null;
}

export function courseAliasRedirectUrl(pathname: string, requestUrl: URL) {
  const configuredSiteUrl = process.env.SITE_URL ?? process.env.AUTH_URL;
  if (configuredSiteUrl) {
    try {
      const siteUrl = new URL(configuredSiteUrl);
      if (siteUrl.protocol === 'http:' || siteUrl.protocol === 'https:') {
        return new URL(pathname, siteUrl.origin);
      }
    } catch {
      // Fall back to the incoming origin when local configuration is invalid.
    }
  }

  return new URL(pathname, requestUrl.origin);
}
