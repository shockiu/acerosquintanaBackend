import { z } from 'zod';

export const changeRequestSchema = z.object({
  _id: z.string(),
  entity: z.enum(['inventoryItem', 'inventoryMovement', 'work']),
  action: z.enum(['create', 'update', 'delete', 'purchase']),
  targetId: z.string().optional().nullable(),
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
