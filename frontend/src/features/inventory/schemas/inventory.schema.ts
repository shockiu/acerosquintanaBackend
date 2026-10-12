import { z } from 'zod';
import { paginationMetaSchema } from '@/types/pagination';

export const unitSchema = z.object({
  _id: z.string(),
  name: z.string(),
  symbol: z.string().optional(),
  allowsDecimals: z.boolean().optional(),
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
  kind: z.enum(['material', 'tool']).optional(),
});

export const pieceSpecSchema = z.object({
  pieceSize: z.coerce.number(),
  measureUnit: z.any(),
  minUsableMeasure: z.coerce.number().optional().nullable(),
});

export const inventoryItemSchema = z.object({
  _id: z.string(),
  name: z.string(),
  kind: z.enum(['material', 'tool']),
  subcategory: subcategorySchema.optional().nullable().or(z.string()),
  stock: z.coerce.number(),
  avgUnitCost: z.coerce.number().optional(), // Puede no venir si es User
  pieceSpec: pieceSpecSchema.optional().nullable(),
  wholePieces: z.coerce.number().optional(),
  availableRemnantsCount: z.coerce.number().optional(),
  availableRemnantsMeasure: z.coerce.number().optional(),
  totalMeasure: z.coerce.number().optional(),
  inventoryValue: z.coerce.number().optional(),
});

export const remnantSchema = z.object({
  _id: z.string(),
  item: z.any(),
  measure: z.coerce.number(),
  costPerMeasureSnapshot: z.coerce.number().optional(),
  status: z.enum(['available', 'used', 'discarded']),
  originWork: z.any().optional(),
  parentRemnant: z.string().optional(),
  createdAt: z.string().optional(),
});

export const paginatedInventoryItemsSchema = z.object({
  items: z.array(inventoryItemSchema),
  pagination: paginationMetaSchema,
});
export type PaginatedInventoryItems = z.infer<typeof paginatedInventoryItemsSchema>;

export const paginatedCategoriesSchema = z.object({
  categories: z.array(categorySchema),
  pagination: paginationMetaSchema,
});
export type PaginatedCategories = z.infer<typeof paginatedCategoriesSchema>;

export const paginatedSubcategoriesSchema = z.object({
  subcategories: z.array(subcategorySchema),
  pagination: paginationMetaSchema,
});
export type PaginatedSubcategories = z.infer<typeof paginatedSubcategoriesSchema>;

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Subcategory = z.infer<typeof subcategorySchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Remnant = z.infer<typeof remnantSchema>;

export type PieceSpec = z.infer<typeof pieceSpecSchema>;
