import { describe, it, expect } from 'vitest';
import { pieceSpecSchema, createItemSchema, purchaseSchema } from './inventorySchemas';

describe('inventorySchemas', () => {
  it('validates a correct pieceSpec', () => {
    const valid = {
      pieceSize: 6.0,
      measureUnit: 'unit123',
      minUsableMeasure: 0.5,
    };
    expect(pieceSpecSchema.parse(valid)).toEqual(valid);
  });

  it('rejects pieceSpec when minUsableMeasure is greater than or equal to pieceSize', () => {
    expect(() =>
      pieceSpecSchema.parse({
        pieceSize: 6.0,
        measureUnit: 'unit123',
        minUsableMeasure: 6.0,
      })
    ).toThrow('minUsableMeasure must be smaller than pieceSize');
  });

  it('validates createItemSchema for material with pieceSpec', () => {
    const valid = {
      body: {
        subcategory: 'sub1',
        name: 'Tubo 6m',
        kind: 'material' as const,
        pieceSpec: {
          pieceSize: 6.0,
          measureUnit: 'unit1',
        },
      },
    };
    expect(createItemSchema.parse(valid)).toBeDefined();
  });

  it('rejects pieceSpec when kind is tool', () => {
    const invalid = {
      body: {
        subcategory: 'sub1',
        name: 'Martillo',
        kind: 'tool' as const,
        pieceSpec: {
          pieceSize: 1.0,
          measureUnit: 'unit1',
        },
      },
    };
    expect(() => createItemSchema.parse(invalid)).toThrow('pieceSpec is only allowed for materials');
  });

  it('validates purchaseSchema with body and params', () => {
    const valid = {
      body: {
        quantity: 10,
        unitCost: 15,
        note: 'Compra enero',
      },
      params: {
        id: 'item123',
      },
    };
    expect(purchaseSchema.parse(valid)).toBeDefined();

    expect(() =>
      purchaseSchema.parse({
        body: { quantity: -5 },
        params: { id: 'item123' },
      })
    ).toThrow();
  });
});
