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

// Tool usage: tools are returned to the workshop by default. Only units declared
// as lost (damaged / end of life) are written off from stock on approval.
const toolLine = z.object({
  item: z.string().min(1),
  mode: z.literal('tool'),
  quantity: z.number().int().positive(),
  lostQuantity: z.number().int().min(0).default(0),
  lossReason: z.enum(['damaged', 'end_of_life']).optional(),
  note: z.string().optional(),
}).refine(
  (v) => v.lostQuantity <= v.quantity,
  { message: 'lostQuantity cannot exceed quantity', path: ['lostQuantity'] }
).refine(
  (v) => v.lostQuantity === 0 || v.lossReason !== undefined,
  { message: 'lossReason is required when lostQuantity > 0', path: ['lossReason'] }
);

// Legacy line: plain quantity in the item's own unit (items without pieceSpec).
// Must stay last. Display-only keys sent by the client are stripped, but a `mode`
// key is rejected so it never swallows lines that failed a more specific branch.
const legacyLine = z.object({
  item: z.string().min(1),
  quantity: z.number().positive(),
  mode: z.undefined().optional(),
});

export const workItemLineSchema = z.union([piecesLine, measureLine, wasteLine, toolLine, legacyLine]);

export const createWorkSchema = z.object({
  body: z.object({
    clientName: z.string().min(1),
    description: z.string().optional(),
    performedAt: z.string().datetime(),
    chargedPrice: z.number().positive().optional(),
    items: z.array(workItemLineSchema).optional(),
  }),
});
