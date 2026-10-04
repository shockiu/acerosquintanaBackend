import { z } from 'zod';
import { inventoryItemSchema } from '@/features/inventory/schemas/inventory.schema';

export const workItemSchema = z.object({
  item: inventoryItemSchema.or(z.string()).optional().nullable(),
  quantity: z.coerce.number(),
  unitCostSnapshot: z.coerce.number().optional(), // Admin solo
  subtotal: z.coerce.number().optional(),
});

export const workSchema = z.object({
  _id: z.string(),
  clientName: z.string(),
  description: z.string().optional(),
  status: z.string(),
  performedAt: z.string(),
  items: z.array(workItemSchema),
  chargedPrice: z.coerce.number().optional(), // Admin solo
  totalCost: z.coerce.number().optional(), // Admin solo
  profit: z.coerce.number().optional(), // Admin solo
  registeredBy: z.object({
    name: z.string().optional(),
    email: z.string(),
  }).optional(),
});

export type Work = z.infer<typeof workSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
