import apiClient from '@/api/axiosClient';
import {
  paginatedUsersSchema,
  userSchema,
  type User,
  type PaginatedUsersResponse,
  type CreateUserInput,
  type UpdateUserInput,
} from '../schemas/users.schema';
import { z } from 'zod';

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export const usersApi = {
  async getUsers(params?: UserQueryParams): Promise<PaginatedUsersResponse | User[]> {
    const data = await apiClient.get('/users', { params });
    if (params?.page) {
      return paginatedUsersSchema.parse(data);
    }
    if (data && typeof data === 'object' && 'users' in data) {
      return paginatedUsersSchema.parse(data);
    }
    return z.array(userSchema).parse(data);
  },

  async createUser(payload: CreateUserInput): Promise<User> {
    const data = await apiClient.post('/users', payload);
    return userSchema.parse(data);
  },

  async updateUser(id: string, payload: UpdateUserInput): Promise<User> {
    const data = await apiClient.patch(`/users/${id}`, payload);
    return userSchema.parse(data);
  },

  async changePassword(id: string, password: string): Promise<User> {
    const data = await apiClient.patch(`/users/${id}/password`, { password });
    return userSchema.parse(data);
  },

  async toggleStatus(id: string, isActive: boolean): Promise<User> {
    const data = await apiClient.patch(`/users/${id}/status`, { isActive });
    return userSchema.parse(data);
  },
};
