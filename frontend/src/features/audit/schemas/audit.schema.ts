import { z } from 'zod';

export const auditLogSchema = z.object({
  _id: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.any().optional(),
  before: z.any().optional(),
  after: z.any().optional(),
  ip: z.string().optional(),
  actor: z.object({
    _id: z.string(),
    email: z.string(),
    name: z.string().optional(),
  }).optional().nullable(),
  createdAt: z.string(),
});

export const auditResponseSchema = z.object({
  logs: z.array(auditLogSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditResponse = z.infer<typeof auditResponseSchema>;
