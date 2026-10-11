import { describe, it, expect } from 'vitest';
import { workItemLineSchema, createWorkSchema } from './workSchemas';

describe('workSchemas', () => {
  it('validates a whole pieces item line', () => {
    const valid = {
      item: 'item123',
      mode: 'pieces',
      quantity: 3,
    };
    expect(workItemLineSchema.parse(valid)).toEqual(valid);

    // Reject non-integer quantity
    expect(() => workItemLineSchema.parse({ ...valid, quantity: 2.5 })).toThrow();
  });

  it('validates measure line from whole piece (no remnant allowed)', () => {
    const valid = {
      item: 'item123',
      mode: 'measure',
      source: 'whole_piece',
      measureUsed: 2.7,
    };
    expect(workItemLineSchema.parse(valid)).toEqual(valid);

    // Reject if remnant is passed when source is whole_piece
    expect(() =>
      workItemLineSchema.parse({ ...valid, remnant: 'remnant123' })
    ).toThrow();
  });

  it('validates measure line from remnant (remnant required)', () => {
    const valid = {
      item: 'item123',
      mode: 'measure',
      source: 'remnant',
      remnant: 'rem123',
      measureUsed: 1.5,
    };
    expect(workItemLineSchema.parse(valid)).toEqual(valid);

    // Reject if remnant is missing
    expect(() =>
      workItemLineSchema.parse({
        item: 'item123',
        mode: 'measure',
        source: 'remnant',
        measureUsed: 1.5,
      })
    ).toThrow();
  });

  it('validates manual waste line', () => {
    const valid = {
      item: 'item123',
      mode: 'waste',
      remnant: 'rem123',
      note: 'Dañado',
    };
    expect(workItemLineSchema.parse(valid)).toEqual(valid);
  });

  it('validates legacy line without mode', () => {
    const valid = {
      item: 'item123',
      quantity: 50,
    };
    expect(workItemLineSchema.parse(valid)).toEqual(valid);
  });

  it('validates createWorkSchema body payload', () => {
    const valid = {
      body: {
        clientName: 'Juan Perez',
        description: 'Estructura metálica',
        performedAt: new Date().toISOString(),
        chargedPrice: 1500,
        items: [
          { item: 'item1', mode: 'pieces', quantity: 2 },
          { item: 'item2', quantity: 10 },
        ],
      },
    };
    expect(createWorkSchema.parse(valid)).toBeDefined();

    // Rejects invalid date
    expect(() =>
      createWorkSchema.parse({
        body: {
          clientName: 'Juan Perez',
          performedAt: 'not-a-date',
        },
      })
    ).toThrow();
  });
});
