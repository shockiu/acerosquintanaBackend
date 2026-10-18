import { z } from 'zod';
import { paginationMetaSchema } from '@/types/pagination';

export const saleItemSchema = z.object({
  item: z.any(),
  name: z.string(),
  kind: z.enum(['material', 'tool']),
  unitSymbol: z.string().optional(),
  quantity: z.coerce.number(),
  unitCostSnapshot: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  subtotalCost: z.coerce.number().optional(),
  subtotalPrice: z.coerce.number().optional(),
  profit: z.coerce.number().optional(),
});

export const saleSchema = z.object({
  _id: z.string(),
  folio: z.string().optional(),
  buyerName: z.string(),
  performedAt: z.string(),
  items: z.array(saleItemSchema).default([]),
  totalAmount: z.coerce.number().optional(),
  totalCost: z.coerce.number().optional(),
  profit: z.coerce.number().optional(),
  profitMargin: z.coerce.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['completed', 'cancelled']),
  registeredBy: z.union([
    z.object({
      _id: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
    }),
    z.string(),
  ]).optional().nullable(),
  cancelledBy: z.union([
    z.object({
      _id: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
    }),
    z.string(),
  ]).optional().nullable(),
  cancelledAt: z.string().optional(),
  cancellationReason: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const salesSummarySchema = z.object({
  totalRevenue: z.coerce.number(),
  totalCost: z.coerce.number(),
  totalProfit: z.coerce.number(),
  profitMargin: z.coerce.number(),
  completedCount: z.coerce.number(),
});

export const paginatedSalesSchema = z.object({
  sales: z.array(saleSchema),
  pagination: paginationMetaSchema,
  summary: salesSummarySchema.nullable().optional(),
});

export const pendingApprovalResponseSchema = z.object({
  isPendingApproval: z.literal(true),
  message: z.string().optional(),
  changeRequest: z.any().optional(),
});

export const saleMutationResponseSchema = z.union([
  saleSchema,
  pendingApprovalResponseSchema,
]);

export type SaleItem = z.infer<typeof saleItemSchema>;
export type Sale = z.infer<typeof saleSchema>;
export type SalesSummary = z.infer<typeof salesSummarySchema>;
export type PaginatedSales = z.infer<typeof paginatedSalesSchema>;
export type SaleMutationResponse = z.infer<typeof saleMutationResponseSchema>;

export interface CreateSaleItemPayload {
  item: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
  unitSymbol?: string;
}

export interface CreateSalePayload {
  buyerName: string;
  performedAt?: string;
  notes?: string;
  items: CreateSaleItemPayload[];
}
