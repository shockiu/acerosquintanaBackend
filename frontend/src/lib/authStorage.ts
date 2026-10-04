const TOKEN_KEY = 'aceros_admin_token';
const SESSION_KEY = 'aceros_admin_session';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStoredSession(): any | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function storeSession({ token, admin }: { token: string, admin: any }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}
