import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { LoadingState } from '@/components/shared/states';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingSession } = useAuth();
  const location = useLocation();

  if (isLoadingSession) {
    return <LoadingState fullScreen label="Verificando sesión..." />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
