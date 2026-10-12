import { z } from 'zod';

export const userSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
});

export type User = z.infer<typeof userSchema>;

export const paginatedUsersSchema = z.object({
  users: z.array(userSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type PaginatedUsersResponse = z.infer<typeof paginatedUsersSchema>;

export const createUserFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'user']),
});

export type CreateUserInput = z.infer<typeof createUserFormSchema>;

export const changePasswordFormSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirma la contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordFormSchema>;

export const updateUserFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  email: z.string().email('Correo electrónico inválido').optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserFormSchema>;
