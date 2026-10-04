import { z } from 'zod';

export const approveRequestSchema = z.object({
  body: z.object({
    overrides: z.record(z.string(), z.any()).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  })
});

export const rejectRequestSchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
  params: z.object({
    id: z.string().min(1),
  })
});
