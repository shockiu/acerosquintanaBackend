import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  PieceConsumptionService,
  InventoryItemForConsumption,
  RemnantForConsumption,
} from './PieceConsumptionService';

describe('PieceConsumptionService', () => {
  describe('Adenda Section 4 Numerical Example', () => {
    // Tubo, pieceSize = 3 m, avgUnitCost = 30 por pieza, stock = 2, minUsableMeasure = 0.2
    const baseItem: InventoryItemForConsumption = {
      name: 'Tubo 3m',
      kind: 'material',
      stock: 2,
      avgUnitCost: 30,
      pieceSpec: {
        pieceSize: 3,
        minUsableMeasure: 0.2,
      },
    };

    it('calculates cost per measure correctly: 30 / 3 = 10', () => {
      const costPerM = PieceConsumptionService.getCostPerMeasure(
        baseItem.avgUnitCost,
        baseItem.pieceSpec!.pieceSize
      );
      expect(costPerM.toNumber()).toBe(10);
    });

    it('Step 1: Work A uses 2.7 m from whole piece -> stock -1, cost 27, remnant 0.3 m ($3)', () => {
      const resA = PieceConsumptionService.consumeMeasureFromWholePiece(baseItem, 2.7);

      expect(resA.piecesDeducted.toNumber()).toBe(1);
      expect(resA.subtotal.toNumber()).toBe(27);
      expect(resA.unitCostSnapshot.toNumber()).toBe(10);
      expect(resA.wasteGenerated).toBeNull();

      expect(resA.remnantCreated).not.toBeNull();
      expect(resA.remnantCreated!.measure.toNumber()).toBe(0.3);
      expect(resA.remnantCreated!.costPerMeasureSnapshot.toNumber()).toBe(10);
      expect(resA.remnantCreated!.measure.mul(resA.remnantCreated!.costPerMeasureSnapshot).toNumber()).toBe(3);
    });

    it('Step 2: Work B uses 0.25 m from the 0.3 m remnant -> cost 2.5, remainder 0.05 < 0.2 => waste ($0.5)', () => {
      const remnantA: RemnantForConsumption = {
        _id: 'remnant-A-id',
        measure: 0.3,
        costPerMeasureSnapshot: 10,
        status: 'available',
      };

      const resB = PieceConsumptionService.consumeMeasureFromRemnant(baseItem, remnantA, 0.25);

      expect(resB.piecesDeducted.toNumber()).toBe(0);
      expect(resB.subtotal.toNumber()).toBe(2.5);
      expect(resB.unitCostSnapshot.toNumber()).toBe(10);
      expect(resB.remnantCreated).toBeNull(); // 0.05 < 0.2 so NO remnant

      expect(resB.wasteGenerated).not.toBeNull();
      expect(resB.wasteGenerated!.measure.toNumber()).toBe(0.05);
      expect(resB.wasteGenerated!.cost.toNumber()).toBe(0.5);
      expect(resB.wasteGenerated!.costPerMeasureSnapshot.toNumber()).toBe(10);
      expect(resB.wasteGenerated!.manual).toBe(false);
    });

    it('Step 3: Total inventory value after step 2 -> 1 piece * 30 = 30', () => {
      const itemAfter: InventoryItemForConsumption = {
        ...baseItem,
        stock: 1, // 1 whole piece left
      };
      // Remnant was fully consumed into waste, no available remnants left
      const availableRemnants: RemnantForConsumption[] = [];

      const totalVal = PieceConsumptionService.calculateTotalInventoryValue(itemAfter, availableRemnants);
      expect(totalVal.toNumber()).toBe(30);
    });
  });

  describe('User Example: Tube of 3m at $6 (rate: $2/m)', () => {
    const item: InventoryItemForConsumption = {
      name: 'Tubo 3m $6',
      kind: 'material',
      stock: 3,
      avgUnitCost: 6,
      pieceSpec: {
        pieceSize: 3,
        minUsableMeasure: 0.2,
      },
    };

    it('Uses 1.8 m from whole piece -> -1 piece, subtotal $3.6, remnant 1.2 m ($2.4)', () => {
      const res = PieceConsumptionService.consumeMeasureFromWholePiece(item, 1.8);

      expect(res.piecesDeducted.toNumber()).toBe(1);
      expect(res.subtotal.toNumber()).toBe(3.6);
      expect(res.remnantCreated!.measure.toNumber()).toBe(1.2);
      expect(res.remnantCreated!.costPerMeasureSnapshot.toNumber()).toBe(2);
      expect(res.remnantCreated!.measure.mul(res.remnantCreated!.costPerMeasureSnapshot).toNumber()).toBe(2.4);
      expect(res.wasteGenerated).toBeNull();
    });

    it('Subsequent cut from the 1.2 m remnant of 1.1 m -> leaves 0.1 m (< 0.2) as waste ($0.2)', () => {
      const remnant: RemnantForConsumption = {
        _id: 'remnant-1-id',
        measure: 1.2,
        costPerMeasureSnapshot: 2,
        status: 'available',
      };

      const res = PieceConsumptionService.consumeMeasureFromRemnant(item, remnant, 1.1);

      expect(res.piecesDeducted.toNumber()).toBe(0);
      expect(res.subtotal.toNumber()).toBe(2.2);
      expect(res.remnantCreated).toBeNull();
      expect(res.wasteGenerated!.measure.toNumber()).toBe(0.1);
      expect(res.wasteGenerated!.cost.toNumber()).toBe(0.2);
    });
  });

  describe('Mode "pieces" (whole pieces only)', () => {
    const item: InventoryItemForConsumption = {
      name: 'Tubo 6m',
      kind: 'material',
      stock: 5,
      avgUnitCost: 50,
      pieceSpec: { pieceSize: 6 },
    };

    it('consumes 2 whole pieces without generating remnants', () => {
      const res = PieceConsumptionService.consumeWholePieces(item, 2);
      expect(res.piecesDeducted.toNumber()).toBe(2);
      expect(res.subtotal.toNumber()).toBe(100);
      expect(res.unitCostSnapshot.toNumber()).toBe(50);
      expect(res.remnantCreated).toBeNull();
      expect(res.wasteGenerated).toBeNull();
    });

    it('rejects decimal quantity in consumeWholePieces', () => {
      expect(() => PieceConsumptionService.consumeWholePieces(item, 2.5 as any)).toThrow(
        /número entero positivo/
      );
    });

    it('throws when stock is insufficient', () => {
      expect(() => PieceConsumptionService.consumeWholePieces(item, 6)).toThrow(
        /Stock insuficiente/
      );
    });
  });

  describe('Mode "measure" exceeding pieceSize (Decision A)', () => {
    const item: InventoryItemForConsumption = {
      name: 'Tubo 6m',
      kind: 'material',
      stock: 3,
      avgUnitCost: 60, // $10/m
      pieceSpec: { pieceSize: 6, minUsableMeasure: 0.5 },
    };

    it('consuming 7 m takes ceil(7/6) = 2 pieces and leaves a remnant of 5 m', () => {
      const res = PieceConsumptionService.consumeMeasureFromWholePiece(item, 7);

      expect(res.piecesDeducted.toNumber()).toBe(2);
      expect(res.subtotal.toNumber()).toBe(70); // 7m * $10/m
      expect(res.remnantCreated).not.toBeNull();
      expect(res.remnantCreated!.measure.toNumber()).toBe(5); // 12m - 7m = 5m
      expect(res.remnantCreated!.costPerMeasureSnapshot.toNumber()).toBe(10);
      expect(res.wasteGenerated).toBeNull();
    });

    it('consuming exactly a multiple of pieceSize leaves 0 remainder (no remnant, no waste)', () => {
      const res = PieceConsumptionService.consumeMeasureFromWholePiece(item, 12);
      expect(res.piecesDeducted.toNumber()).toBe(2);
      expect(res.subtotal.toNumber()).toBe(120);
      expect(res.remnantCreated).toBeNull();
      expect(res.wasteGenerated).toBeNull();
    });
  });

  describe('Manual waste from remnant', () => {
    it('generates a manual waste result with proper measure and cost', () => {
      const remnant: RemnantForConsumption = {
        _id: 'remnant-damaged',
        measure: 1.5,
        costPerMeasureSnapshot: 10,
        status: 'available',
      };

      const res = PieceConsumptionService.manualWasteFromRemnant(remnant);
      expect(res.piecesDeducted.toNumber()).toBe(0);
      expect(res.subtotal.toNumber()).toBe(0);
      expect(res.wasteGenerated).not.toBeNull();
      expect(res.wasteGenerated!.measure.toNumber()).toBe(1.5);
      expect(res.wasteGenerated!.cost.toNumber()).toBe(15);
      expect(res.wasteGenerated!.manual).toBe(true);
    });

    it('throws if remnant is not available', () => {
      const remnant: RemnantForConsumption = {
        _id: 'remnant-used',
        measure: 1.5,
        costPerMeasureSnapshot: 10,
        status: 'used',
      };
      expect(() => PieceConsumptionService.manualWasteFromRemnant(remnant)).toThrow(
        /no está disponible/
      );
    });
  });

  describe('Legacy consumption', () => {
    it('consumes plain material quantity without pieces correctly', () => {
      const legacyItem: InventoryItemForConsumption = {
        name: 'Tornillos',
        kind: 'material',
        stock: 100,
        avgUnitCost: 0.5,
      };

      const res = PieceConsumptionService.consumeLegacy(legacyItem, 20);
      expect(res.piecesDeducted.toNumber()).toBe(20);
      expect(res.subtotal.toNumber()).toBe(10);
      expect(res.unitCostSnapshot.toNumber()).toBe(0.5);
    });

    it('tools do not deduct stock or add subtotal', () => {
      const toolItem: InventoryItemForConsumption = {
        name: 'Taladro',
        kind: 'tool',
        stock: 5,
        avgUnitCost: 200,
      };

      const res = PieceConsumptionService.consumeLegacy(toolItem, 1);
      expect(res.piecesDeducted.toNumber()).toBe(0);
      expect(res.subtotal.toNumber()).toBe(0);
    });

    it('throws when material stock is insufficient', () => {
      const legacyItem: InventoryItemForConsumption = {
        name: 'Tornillos',
        kind: 'material',
        stock: 5,
        avgUnitCost: 0.5,
      };

      expect(() => PieceConsumptionService.consumeLegacy(legacyItem, 10)).toThrow(
        /Stock insuficiente/
      );
    });

    it('calculates total inventory value correctly ignoring non-available remnants', () => {
      const item: InventoryItemForConsumption = {
        name: 'Tubo 6m',
        kind: 'material',
        stock: 10,
        avgUnitCost: 50,
      };

      const remnants: RemnantForConsumption[] = [
        { _id: 'r1', measure: 2, costPerMeasureSnapshot: 10, status: 'available' },
        { _id: 'r2', measure: 1.5, costPerMeasureSnapshot: 10, status: 'consumed' },
        { _id: 'r3', measure: 0.5, costPerMeasureSnapshot: 10, status: 'discarded' },
      ];

      // stock: 10 * 50 = 500, available remnant: 2 * 10 = 20, total = 520
      const total = PieceConsumptionService.calculateTotalInventoryValue(item, remnants);
      expect(total.toNumber()).toBe(520);
    });
  });
});
