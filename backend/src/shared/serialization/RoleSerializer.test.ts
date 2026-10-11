import { describe, it, expect } from 'vitest';
import { RoleSerializer } from './RoleSerializer';
import mongoose from 'mongoose';

describe('RoleSerializer', () => {
  it('returns primitive and null/undefined values as-is', () => {
    expect(RoleSerializer.serialize(null, 'admin')).toBeNull();
    expect(RoleSerializer.serialize(undefined, 'user')).toBeUndefined();
    expect(RoleSerializer.serialize('hello', 'user')).toBe('hello');
    expect(RoleSerializer.serialize(123, 'admin')).toBe(123);
    expect(RoleSerializer.serialize(true, 'user')).toBe(true);
  });

  it('formats Date instances to ISO string', () => {
    const now = new Date();
    expect(RoleSerializer.serialize(now, 'user')).toBe(now.toISOString());
  });

  it('converts ObjectId to string', () => {
    const id = new mongoose.Types.ObjectId();
    expect(RoleSerializer.serialize(id, 'user')).toBe(id.toString());
  });

  it('strips all sensitive financial fields for user role', () => {
    const item = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Tubo 2"',
      stock: 10,
      avgUnitCost: '25.50',
      unitCost: '25.50',
      totalCost: '255.00',
      chargedPrice: '300.00',
      materialsCost: '200.00',
      profit: '100.00',
      wasteCost: '15.00',
      costPerMeasureSnapshot: '4.25',
      nested: {
        avgUnitCost: '50.00',
        publicNote: 'Normal note',
      },
    };

    const serialized = RoleSerializer.serialize(item, 'user');

    expect(serialized.name).toBe('Tubo 2"');
    expect(serialized.stock).toBe(10);
    expect(serialized.avgUnitCost).toBeUndefined();
    expect(serialized.unitCost).toBeUndefined();
    expect(serialized.totalCost).toBeUndefined();
    expect(serialized.chargedPrice).toBeUndefined();
    expect(serialized.materialsCost).toBeUndefined();
    expect(serialized.profit).toBeUndefined();
    expect(serialized.wasteCost).toBeUndefined();
    expect(serialized.costPerMeasureSnapshot).toBeUndefined();
    expect(serialized.nested.avgUnitCost).toBeUndefined();
    expect(serialized.nested.publicNote).toBe('Normal note');
  });

  it('preserves all sensitive financial fields for admin role', () => {
    const item = {
      name: 'Tubo 2"',
      avgUnitCost: '25.50',
      profit: '100.00',
      wasteCost: '15.00',
    };

    const serialized = RoleSerializer.serialize(item, 'admin');

    expect(serialized.avgUnitCost).toBe('25.50');
    expect(serialized.profit).toBe('100.00');
    expect(serialized.wasteCost).toBe('15.00');
  });

  it('handles arrays of items properly', () => {
    const items = [
      { name: 'Item 1', profit: '50' },
      { name: 'Item 2', profit: '75' },
    ];

    const forUser = RoleSerializer.serialize(items, 'user');
    expect(forUser).toHaveLength(2);
    expect(forUser[0].profit).toBeUndefined();
    expect(forUser[1].profit).toBeUndefined();

    const forAdmin = RoleSerializer.serialize(items, 'admin');
    expect(forAdmin[0].profit).toBe('50');
    expect(forAdmin[1].profit).toBe('75');
  });

  it('handles objects with toObject method (Mongoose Docs)', () => {
    const docMock = {
      toObject: () => ({
        name: 'Obra 1',
        chargedPrice: '1000',
      }),
    };

    const userResult = RoleSerializer.serialize(docMock, 'user');
    expect(userResult.name).toBe('Obra 1');
    expect(userResult.chargedPrice).toBeUndefined();

    const adminResult = RoleSerializer.serialize(docMock, 'admin');
    expect(adminResult.chargedPrice).toBe('1000');
  });

  it('handles Decimal128 BSON type conversion', () => {
    const mockDecimal = {
      _bsontype: 'Decimal128',
      toString: () => '12.34',
    };

    const serialized = RoleSerializer.serialize(mockDecimal, 'admin');
    expect(serialized).toBe('12.34');
  });
});
