import { z } from 'zod';

export const pieceSpecSchema = z.object({
  pieceSize: z.number().positive(),
  measureUnit: z.string().min(1),
  minUsableMeasure: z.number().positive().optional(),
}).refine(
  (v) => v.minUsableMeasure === undefined || v.minUsableMeasure < v.pieceSize,
  { message: 'minUsableMeasure must be smaller than pieceSize', path: ['minUsableMeasure'] }
);

export const createItemSchema = z.object({
  body: z.object({
    subcategory: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    kind: z.enum(['material', 'tool']).optional(),
    pieceSpec: pieceSpecSchema.optional(),
  }).refine(
    (v) => v.pieceSpec === undefined || v.kind === undefined || v.kind === 'material',
    { message: 'pieceSpec is only allowed for materials', path: ['pieceSpec'] }
  ),
});

export const purchaseSchema = z.object({
  body: z.object({
    quantity: z.number().positive(),
    unitCost: z.number().positive().optional(),
    totalCost: z.number().positive().optional(),
    note: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  })
});
