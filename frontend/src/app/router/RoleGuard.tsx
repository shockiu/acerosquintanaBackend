import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export default function RoleGuard({
  roles,
  children,
}: {
  roles?: string[];
  children: React.ReactNode;
}) {
  const { admin } = useAuth();

  if (roles && roles.length > 0 && admin?.role && !roles.includes(admin.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
