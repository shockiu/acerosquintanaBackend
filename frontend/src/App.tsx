import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppProviders from '@/app/providers/AppProviders';
import AuthGuard from '@/app/router/AuthGuard';
import { AuthProvider } from '@/features/auth/AuthContext';
import LoginPage from '@/features/auth/LoginPage';
import MainLayout from '@/layouts/MainLayout/MainLayout';
import { LoadingState } from '@/components/shared/states';
import { MAIN_PAGES } from '@/pages.config';

import RoleGuard from '@/app/router/RoleGuard';

export default function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <AuthGuard>
                <MainLayout />
              </AuthGuard>
            }
          >
            {MAIN_PAGES.map(({ path, component: Component, roles }) => (
              <Route
                key={path}
                path={path}
                element={
                  <Suspense fallback={<LoadingState />}>
                    <RoleGuard roles={roles}>
                      <Component />
                    </RoleGuard>
                  </Suspense>
                }
              />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </AppProviders>
  );
}
