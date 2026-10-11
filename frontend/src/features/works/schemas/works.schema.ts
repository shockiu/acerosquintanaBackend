import { z } from 'zod';
import { inventoryItemSchema } from '@/features/inventory/schemas/inventory.schema';

export const workWasteItemSchema = z.object({
  item: z.any().optional(),
  subcategory: z.any().optional(),
  measure: z.coerce.number(),
  measureUnit: z.any().optional(),
  costPerMeasureSnapshot: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  remnant: z.string().optional(),
  manual: z.boolean().optional(),
  note: z.string().optional(),
});

export const workItemSchema = z.object({
  item: inventoryItemSchema.or(z.string()).optional().nullable(),
  mode: z.enum(['pieces', 'measure', 'waste']).optional(),
  source: z.enum(['whole_piece', 'remnant']).optional(),
  remnant: z.string().optional(),
  measureUsed: z.coerce.number().optional(),
  piecesConsumed: z.coerce.number().optional(),
  quantity: z.coerce.number().optional(),
  unitCostSnapshot: z.coerce.number().optional(), // Admin solo
  subtotal: z.coerce.number().optional(),
});

export const workSchema = z.object({
  _id: z.string(),
  clientName: z.string(),
  description: z.string().optional(),
  status: z.string(),
  performedAt: z.string(),
  items: z.array(workItemSchema).optional().default([]),
  waste: z.array(workWasteItemSchema).optional().default([]),
  chargedPrice: z.coerce.number().optional(), // Admin solo
  materialsCost: z.coerce.number().optional(), // Admin solo
  wasteCost: z.coerce.number().optional(), // Admin solo
  totalCost: z.coerce.number().optional(), // Alias
  profit: z.coerce.number().optional(), // Admin solo
  registeredBy: z.object({
    name: z.string().optional(),
    email: z.string(),
  }).optional(),
});

export type Work = z.infer<typeof workSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type WorkWasteItem = z.infer<typeof workWasteItemSchema>;
