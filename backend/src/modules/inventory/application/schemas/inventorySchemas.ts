import { z } from 'zod';

export const createItemSchema = z.object({
  body: z.object({
    subcategory: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    kind: z.enum(['material', 'tool']),
  }),
});

export const purchaseSchema = z.object({
  body: z.object({
    quantity: z.number().positive(),
    unitCost: z.number().positive().optional(),
    totalCost: z.number().positive().optional(),
    note: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  })
});
