import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  })
});

export const createSubcategorySchema = z.object({
  body: z.object({
    category: z.string().min(1),
    name: z.string().min(1),
    unit: z.string().min(1),
  }),
});

export const updateSubcategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  })
});
