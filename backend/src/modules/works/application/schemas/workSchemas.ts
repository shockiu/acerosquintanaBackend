import { z } from 'zod';

// Consumption of whole pieces (e.g. "2 tubes"). Never takes remnants.
const piecesLine = z.object({
  item: z.string().min(1),
  mode: z.literal('pieces'),
  quantity: z.number().int().positive(),
});

// Consumption by measure (e.g. "2.7 m"), from a whole piece or from a remnant.
const measureLine = z.object({
  item: z.string().min(1),
  mode: z.literal('measure'),
  source: z.enum(['whole_piece', 'remnant']),
  remnant: z.string().min(1).optional(),
  measureUsed: z.number().positive(),
}).refine(
  (v) => (v.source === 'remnant') === (v.remnant !== undefined),
  { message: 'remnant is required when source is "remnant" and not allowed otherwise', path: ['remnant'] }
);

// Manual waste: a remnant that was damaged/lost during the work.
const wasteLine = z.object({
  item: z.string().min(1),
  mode: z.literal('waste'),
  remnant: z.string().min(1),
  note: z.string().optional(),
});

// Legacy line: plain quantity in the item's own unit (items without pieceSpec).
// Must stay last so it never swallows lines that carry a `mode`.
const legacyLine = z.object({
  item: z.string().min(1),
  quantity: z.number().positive(),
}).strict();

export const workItemLineSchema = z.union([piecesLine, measureLine, wasteLine, legacyLine]);

export const createWorkSchema = z.object({
  body: z.object({
    clientName: z.string().min(1),
    description: z.string().optional(),
    performedAt: z.string().datetime(),
    chargedPrice: z.number().positive().optional(),
    items: z.array(workItemLineSchema).optional(),
  }),
});
