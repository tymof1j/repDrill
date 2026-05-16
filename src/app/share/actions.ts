'use server';

import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@convex/_generated/api';

type ShareResourceType = 'course' | 'repertoire' | 'analysis';
type ShareAccess = 'view' | 'copy' | 'collaborate';

const RESEND_API_URL = 'https://api.resend.com/emails';

function normalizeResourceType(value: FormDataEntryValue | null): ShareResourceType {
  if (value === 'course' || value === 'repertoire' || value === 'analysis') return value;
  throw new Error('Invalid share resource.');
}

function normalizeAccess(value: FormDataEntryValue | null): ShareAccess {
  if (value === 'view' || value === 'copy' || value === 'collaborate') return value;
  throw new Error('Invalid access level.');
}

function htmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendShareInvitationAction(formData: FormData) {
  const token = await convexAuthNextjsToken();
  if (!token) throw new Error('Unauthorized');

  const resourceType = normalizeResourceType(formData.get('resourceType'));
  const resourceId = String(formData.get('resourceId') ?? '');
  const emails = String(formData.get('email') ?? '')
    .split(/[,\n;]/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const access = normalizeAccess(formData.get('access'));
  const notify = formData.get('notify') === 'true';
  const message = String(formData.get('message') ?? '').trim();
  const shareUrl = String(formData.get('shareUrl') ?? '').trim();

  if (!resourceId) throw new Error('Missing shared resource.');
  if (emails.length === 0 || emails.some((email) => !email.includes('@'))) {
    throw new Error('Enter valid comma-separated emails.');
  }

  const results = [];
  for (const email of emails) {
    const result = await fetchMutation(
      api.sharing.upsertInvitation,
      {
        resourceType,
        resourceId,
        email,
        access,
        notify,
        message: message || undefined,
      },
      { token },
    );
    results.push({ email, title: result.title });
  }

  if (notify && results.length > 0) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY. Add your real Resend API key to .env.local.');
    }

    const accessLabel =
      access === 'collaborate' ? 'collaborate' : access === 'copy' ? 'view and copy' : 'view';
    const safeTitle = htmlEscape(results[0].title);
    const safeMessage = message ? `<p>${htmlEscape(message)}</p>` : '';
    const url = shareUrl || `${process.env.SITE_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'}/share`;

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: emails,
        subject: `RepDrill shared "${results[0].title}" with you`,
        html: `
          <p>You have been invited to ${accessLabel} <strong>${safeTitle}</strong> in RepDrill.</p>
          ${safeMessage}
          <p><a href="${htmlEscape(url)}">Open shared item</a></p>
        `,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend failed: ${text}`);
    }
  }

  return { ok: true, count: emails.length, title: results[0]?.title ?? '' };
}
