const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'rbhu.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

type Opts = { method?: string; body?: unknown; form?: FormData; query?: Record<string, string | number | undefined> };

export async function api<T = unknown>(path: string, { method = 'GET', body, form, query }: Opts = {}): Promise<T> {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}${qs.length > 1 ? qs : ''}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('rbhu:unauthorized'));
    }
    const e = (data as { error?: { message?: string; code?: string; details?: { path: string; message: string }[] } }).error;
    throw new ApiError(res.status, e?.message ?? `Request failed (${res.status})`, e?.code, Array.isArray(e?.details) ? e!.details : undefined);
  }
  return data as T;
}
