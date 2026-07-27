import { getAuthCookie, POEMS_DATA_URL } from '../auth/client';

export class NexusApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'NexusApiError';
  }
}

export async function poemsApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const cookie = getAuthCookie();
  if (!cookie) throw new NexusApiError('No active Poems session.', 401);

  const headers = new Headers(init?.headers);
  headers.set('cookie', cookie);
  if (init?.body) headers.set('content-type', 'application/json');

  const response = await fetch(`${POEMS_DATA_URL}${path}`, {
    ...init,
    headers,
  });
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && body.error
        ? body.error
        : 'Poems sync request failed.';
    throw new NexusApiError(message, response.status);
  }

  return body as T;
}
