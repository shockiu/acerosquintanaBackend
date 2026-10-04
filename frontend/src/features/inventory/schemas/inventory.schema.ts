import { z } from 'zod';

export const unitSchema = z.object({
  _id: z.string(),
  name: z.string(),
});

export const categorySchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export const subcategorySchema = z.object({
  _id: z.string(),
  name: z.string(),
  category: z.any(),
  unit: z.any(),
});

export const inventoryItemSchema = z.object({
  _id: z.string(),
  name: z.string(),
  kind: z.enum(['material', 'tool']),
  subcategory: subcategorySchema.optional().nullable().or(z.string()),
  stock: z.coerce.number(),
  avgUnitCost: z.coerce.number().optional(), // Puede no venir si es User
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Subcategory = z.infer<typeof subcategorySchema>;
export type Unit = z.infer<typeof unitSchema>;
