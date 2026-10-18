export class RoleSerializer {
  private static readonly sensitiveFields = [
    'avgUnitCost',
    'unitCost',
    'totalCost',
    'chargedPrice',
    'materialsCost',
    'profit',
    'unitCostSnapshot',
    'subtotal',
    'costPerMeasureSnapshot',
    'costPerMeasure',
    'wasteCost',
    'cost',
    'inventoryValue',
    'totalAmount',
    'unitPrice',
    'subtotalPrice',
    'profitMargin',
  ];

  static serialize(data: any, role: 'admin' | 'user'): any {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.serialize(item, role));
    }

    if (typeof data === 'object') {
      // Check if it's a Mongoose Document (has toObject) or Decimal128
      let obj = data;
      if (typeof data.toObject === 'function') {
        obj = data.toObject();
      }
      
      // Convert BSON types and Dates
      if (data instanceof Date) {
        return data.toISOString();
      }
      if (data._bsontype === 'ObjectID' || data._bsontype === 'ObjectId' || (data.constructor && data.constructor.name === 'ObjectId')) {
        return data.toString();
      }
      if (data._bsontype === 'Decimal128' || obj._bsontype === 'Decimal128' || (obj && typeof obj === 'object' && '$numberDecimal' in obj)) {
        return obj.$numberDecimal !== undefined ? obj.$numberDecimal.toString() : obj.toString();
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (role === 'user' && this.sensitiveFields.includes(key)) {
          continue; // Strip sensitive fields for user
        }
        result[key] = this.serialize(value, role);
      }
      return result;
    }

    return data;
  }
}
