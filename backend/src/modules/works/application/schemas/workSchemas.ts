import { z } from 'zod';

export const createWorkSchema = z.object({
  body: z.object({
    clientName: z.string().min(1),
    description: z.string().optional(),
    performedAt: z.string().datetime(),
    chargedPrice: z.number().positive().optional(),
    items: z.array(z.object({
      item: z.string().min(1),
      quantity: z.number().positive(),
    })).optional(),
  }),
});
