import { z } from 'zod';

export const saleItemLineSchema = z.object({
  item: z.string().min(1, 'El ID del ítem es requerido'),
  name: z.string().optional(),
  quantity: z.number().positive('La cantidad vendida debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'El precio unitario no puede ser negativo').optional().default(0),
  unitCost: z.number().min(0, 'El costo unitario no puede ser negativo').optional(),
  unitSymbol: z.string().optional(),
});

export const createSaleSchema = z.object({
  body: z.object({
    buyerName: z.string().trim().min(1, 'El nombre del cliente o comprador es requerido'),
    performedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
    items: z.array(saleItemLineSchema).min(1, 'Debes incluir al menos un ítem en la venta'),
  }),
});

export const cancelSaleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'El ID de la venta es requerido'),
  }),
  body: z.object({
    reason: z.string().trim().min(1, 'El motivo de anulación es obligatorio'),
  }),
});

export const listSalesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['all', 'completed', 'cancelled']).optional().default('all'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>['body'];
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>['query'];
