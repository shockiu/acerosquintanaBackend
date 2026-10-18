import { z } from 'zod';
import { paginationMetaSchema } from '@/types/pagination';

export const changeRequestSchema = z.object({
  _id: z.string(),
  entity: z.enum(['inventoryItem', 'inventoryMovement', 'work', 'remnant', 'category', 'subcategory', 'sale']),
  action: z.enum(['create', 'update', 'delete', 'purchase', 'discard', 'cancel']),

  targetId: z.string().optional().nullable(),
  targetName: z.string().optional().nullable(),
  targetDoc: z.any().optional().nullable(),
  payload: z.any(),
  status: z.enum(['pending', 'approved', 'rejected']),
  requestedBy: z.object({
    _id: z.string(),
    email: z.string(),
    name: z.string().optional(),
  }).optional().nullable(),
  createdAt: z.string().optional(),
});

export type ChangeRequest = z.infer<typeof changeRequestSchema>;

export const paginatedChangeRequestsSchema = z.object({
  requests: z.array(changeRequestSchema),
  pagination: paginationMetaSchema,
});
export type PaginatedChangeRequests = z.infer<typeof paginatedChangeRequestsSchema>;

