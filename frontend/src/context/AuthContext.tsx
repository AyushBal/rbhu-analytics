import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../api/client';
import type { AuthUser } from '../api/types';

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    // Restore session from the stored token
    if (!tokenStore.get()) return setReady(true);
    api<{ user: { sub: string; email: string; name: string; role: string } }>('/auth/me')
      .then((r) => setUser({ id: r.user.sub, email: r.user.email, name: r.user.name, role: r.user.role }))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
    const onUnauthorized = () => setUser(null);
    window.addEventListener('rbhu:unauthorized', onUnauthorized);
    return () => window.removeEventListener('rbhu:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
