import { describe, it, expect } from 'vitest';
import { createSaleSchema, cancelSaleSchema, listSalesQuerySchema } from './saleSchemas';

describe('saleSchemas', () => {
  it('validates a correct sale input', () => {
    const valid = {
      body: {
        buyerName: 'Pedro Pérez',
        notes: 'Venta rápida',
        items: [
          {
            item: '60d5ec49f1b2c8b1f8e4e1a1',
            quantity: 2,
            unitPrice: 15.5,
            unitCost: 10.0,
          },
        ],
      },
    };

    const parsed = createSaleSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects a sale with empty items', () => {
    const invalid = {
      body: {
        buyerName: 'Pedro Pérez',
        items: [],
      },
    };

    const parsed = createSaleSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejects a sale with negative price or zero quantity', () => {
    const invalid = {
      body: {
        buyerName: 'Pedro Pérez',
        items: [
          {
            item: '60d5ec49f1b2c8b1f8e4e1a1',
            quantity: 0,
            unitPrice: -5,
          },
        ],
      },
    };

    const parsed = createSaleSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates cancel sale input with required reason', () => {
    const valid = {
      params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
      body: { reason: 'Error en la factura' },
    };
    expect(cancelSaleSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
      body: { reason: '   ' },
    };
    expect(cancelSaleSchema.safeParse(invalid).success).toBe(false);
  });
});
