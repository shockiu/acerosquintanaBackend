import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { usersApi, type UserQueryParams } from '../services/usersApi';
import { userKeys } from '../users.keys';
import type {
  User,
  PaginatedUsersResponse,
  CreateUserInput,
  UpdateUserInput,
} from '../schemas/users.schema';

export function useUsers(): UseQueryResult<User[]>;
export function useUsers(params: { page: number; limit: number; search?: string; role?: string; isActive?: boolean }): UseQueryResult<PaginatedUsersResponse>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useUsers(params?: UserQueryParams): UseQueryResult<any> {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.getUsers(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserInput) => usersApi.createUser(payload),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Usuario ${user.name} creado exitosamente`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al crear usuario'));
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserInput }) =>
      usersApi.updateUser(id, payload),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Usuario ${user.name} actualizado`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al actualizar usuario'));
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.changePassword(id, password),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Contraseña actualizada correctamente para ${user.name}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al cambiar contraseña'));
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.toggleStatus(id, isActive),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Usuario ${user.name} ${user.isActive ? 'activado' : 'desactivado'}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al actualizar estado del usuario'));
    },
  });
}
