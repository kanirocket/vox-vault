// Thin REST client. All calls hit the Express backend under /api
// (proxied to :3000 in dev, same-origin in the built bundle).

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error || res.statusText;
    throw new ApiError(res.status, message, body);
  }
  return res.status === 204 ? (null as T) : (res.json() as Promise<T>);
}
