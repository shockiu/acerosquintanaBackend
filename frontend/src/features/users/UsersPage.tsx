import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useUsers, useToggleUserStatus } from './hooks/useUsersData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
} from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import CreateUserDialog from './components/CreateUserDialog';
import EditUserDialog from './components/EditUserDialog';
import ChangePasswordDialog from './components/ChangePasswordDialog';
import type { User } from './schemas/users.schema';

export default function UsersPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);

  const queryParams = useMemo(() => {
    return {
      page,
      limit: 10,
      search: searchTerm.trim() || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      isActive:
        statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    };
  }, [page, searchTerm, roleFilter, statusFilter]);

  const { data, isLoading, isError } = useUsers(queryParams);
  const { mutate: toggleStatus, isPending: isToggling } = useToggleUserStatus();

  const users: User[] = Array.isArray(data) ? data : data?.users ?? [];
  const pagination = !Array.isArray(data) && data?.pagination ? data.pagination : null;

  // Handler for status toggling
  const handleConfirmToggle = () => {
    if (!userToToggle) return;
    toggleStatus(
      { id: userToToggle._id, isActive: !userToToggle.isActive },
      {
        onSettled: () => {
          setUserToToggle(null);
        },
      }
    );
  };

  if (!isAdmin) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta sección está restringida exclusivamente a usuarios con rol de Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gestión de Usuarios"
        description="Crea nuevos usuarios, administra accesos y actualiza contraseñas de la plataforma."
        actions={
          <Button variant="brand" onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Nuevo Usuario
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo electrónico..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="user">Operadores</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      {isError ? (
        <ErrorState message="Error al cargar el listado de usuarios." />
      ) : isLoading ? (
        <LoadingState label="Cargando usuarios..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="No se encontraron usuarios"
          description="Intenta ajustar tus criterios de búsqueda o crea un nuevo usuario."
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo Electrónico</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isCurrent =
                    admin?._id === u._id ||
                    admin?.id === u._id ||
                    admin?.email === u.email;

                  return (
                    <TableRow key={u._id} className={!u.isActive ? 'opacity-60 bg-muted/20' : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {u.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{u.name}</span>
                              {isCurrent && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  Tú
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.email}
                      </TableCell>

                      <TableCell>
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                            <ShieldCheck className="h-3 w-3" /> Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            Operador
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Inactivo
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Cambiar Contraseña */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            title={isCurrent ? 'Cambiar mi contraseña' : `Cambiar contraseña de ${u.name}`}
                            onClick={() => setPasswordUser(u)}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Contraseña</span>
                          </Button>

                          {/* Editar Usuario */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs hover:bg-muted"
                            title="Editar datos"
                            onClick={() => setEditUser(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          {/* Alternar Estado */}
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 text-xs ${
                                u.isActive
                                  ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                              }`}
                              title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                              onClick={() => setUserToToggle(u)}
                            >
                              {u.isActive ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Modal: Crear Usuario */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Modal: Editar Usuario */}
      <EditUserDialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        user={editUser}
      />

      {/* Modal: Cambiar Contraseña */}
      <ChangePasswordDialog
        open={!!passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
        user={passwordUser}
        isSelf={
          passwordUser?._id === admin?._id ||
          passwordUser?._id === admin?.id ||
          passwordUser?.email === admin?.email
        }
      />

      {/* Modal Confirmación Desactivación / Activación */}
      <ConfirmDialog
        open={!!userToToggle}
        onOpenChange={(open) => !open && setUserToToggle(null)}
        title={
          userToToggle?.isActive
            ? `¿Desactivar a ${userToToggle?.name}?`
            : `¿Activar a ${userToToggle?.name}?`
        }
        description={
          userToToggle?.isActive
            ? 'El usuario no podrá iniciar sesión en la plataforma mientras su cuenta permanezca inactiva.'
            : 'El usuario podrá volver a iniciar sesión y utilizar la plataforma según los permisos de su rol.'
        }
        confirmLabel={userToToggle?.isActive ? 'Sí, desactivar' : 'Sí, activar'}
        destructive={userToToggle?.isActive}
        isPending={isToggling}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
}
