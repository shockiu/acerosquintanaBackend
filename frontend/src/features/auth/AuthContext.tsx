import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredSession, getStoredToken, storeSession } from '@/lib/authStorage';
import apiClient from '@/api/axiosClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [admin, setAdmin] = useState<any>(getStoredSession());
  const [isLoadingSession, setIsLoadingSession] = useState(!!getStoredToken());

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    // Verify token with backend
    apiClient.get('/auth/me')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((user: any) => {
        if (user) {
          storeSession({ token, admin: user });
          setAdmin(user);
        }
      })
      .catch(() => {
        clearSession();
        setAdmin(null);
      })
      .finally(() => setIsLoadingSession(false));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const login = useCallback(async ({ email, password }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await apiClient.post('/auth/login', { email, password });
    const token = res.token;
    const nextAdmin = res.user;
    if (!token || !nextAdmin) throw new Error('Respuesta de login inválida');
    storeSession({ token, admin: nextAdmin });
    setAdmin(nextAdmin);
    return nextAdmin;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAdmin(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: !!admin && !!getStoredToken(),
      isLoadingSession,
      login,
      logout,
    }),
    [admin, isLoadingSession, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
