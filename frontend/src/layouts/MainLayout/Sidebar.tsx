import { useState } from 'react';
import { LogOut, KeyRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { MAIN_PAGES } from '@/pages.config';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import ChangePasswordDialog from '@/features/users/components/ChangePasswordDialog';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
      : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  );

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const isAdmin = admin?.role === 'admin';
  
  // Filter pages that should be in sidebar and check roles if specified
  const items = MAIN_PAGES.filter((p) => {
    if (!p.showInSidebar) return false;
    if (p.roles && admin?.role) {
      return p.roles.includes(admin.role);
    }
    return true;
  });

  const currentAdminUser = admin && isAdmin ? {
    _id: admin._id || admin.id,
    name: admin.name || admin.full_name || 'Administrador',
    email: admin.email || '',
    role: 'admin' as const,
    isActive: true,
    createdAt: '',
  } : null;

  return (
    <aside className="flex w-full flex-col border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-5">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-primary">Aceros Quintana</p>
        <h1 className="font-heading text-xl font-bold">Panel Administrativo</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map(({ path, name, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} className={linkClass}>
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-lg border border-sidebar-border bg-sidebar-accent p-3">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium">{admin?.full_name || admin?.name || admin?.email?.split('@')[0] || 'Administrador'}</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPasswordOpen(true)}
              title="Cambiar mi contraseña"
              className="text-sidebar-muted hover:text-sidebar-primary transition-colors p-1 rounded hover:bg-sidebar/50"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="truncate text-xs text-sidebar-muted">{admin?.email}</p>
        <p className="mt-1 inline-flex text-[10px] uppercase font-bold text-sidebar-primary">{admin?.role}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>

      {isAdmin && currentAdminUser && (
        <ChangePasswordDialog
          open={isPasswordOpen}
          onOpenChange={setIsPasswordOpen}
          user={currentAdminUser}
          isSelf={true}
        />
      )}
    </aside>
  );
}

