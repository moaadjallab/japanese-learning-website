/** Cloudflare Turnstile server-side verification. https://developers.cloudflare.com/turnstile/ */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const verifyTurnstile = async (
  secret: string,
  token: string | undefined,
  remoteIp?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> => {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);
  try {
    const res = await fetchImpl(VERIFY_URL, { method: 'POST', body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
};
