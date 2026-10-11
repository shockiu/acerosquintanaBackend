import { Decimal } from 'decimal.js';

export interface PieceSpecInput {
  pieceSize: Decimal | string | number;
  minUsableMeasure?: Decimal | string | number | null;
}

export interface InventoryItemForConsumption {
  _id?: any;
  name: string;
  kind: 'material' | 'tool';
  stock: Decimal | string | number;
  avgUnitCost: Decimal | string | number;
  pieceSpec?: PieceSpecInput | null;
  subcategory?: any;
}

export interface RemnantForConsumption {
  _id?: any;
  measure: Decimal | string | number;
  costPerMeasureSnapshot: Decimal | string | number;
  status: 'available' | 'used' | 'discarded';
}

export interface RemnantCreatedResult {
  measure: Decimal;
  costPerMeasureSnapshot: Decimal;
  parentRemnant?: any;
}

export interface WasteGeneratedResult {
  measure: Decimal;
  cost: Decimal;
  costPerMeasureSnapshot: Decimal;
  remnant?: any;
  manual: boolean;
}

export interface ConsumptionResult {
  piecesDeducted: Decimal;
  measureUsed?: Decimal;
  unitCostSnapshot: Decimal;
  subtotal: Decimal;
  remnantCreated?: RemnantCreatedResult | null;
  remnantUsedId?: any;
  wasteGenerated?: WasteGeneratedResult | null;
}

/**
 * Business rule configuration:
 * Option 1: Waste cost reduces work profit (profit = chargedPrice - materialsCost - wasteCost).
 */
export const WASTE_CHARGED_TO_PROFIT = true;

export class PieceConsumptionService {
  /**
   * Derives costPerMeasure = avgUnitCost / pieceSize
   */
  static getCostPerMeasure(avgUnitCost: Decimal | string | number, pieceSize: Decimal | string | number): Decimal {
    const cost = new Decimal(avgUnitCost.toString());
    const size = new Decimal(pieceSize.toString());
    if (size.lte(0)) {
      throw new Error('pieceSize debe ser mayor a 0');
    }
    return cost.div(size);
  }

  /**
   * Mode: 'pieces'
   * Consumes N whole pieces directly from stock. Never generates remnants.
   */
  static consumeWholePieces(
    item: InventoryItemForConsumption,
    quantity: number
  ): ConsumptionResult {
    if (!item.pieceSpec) {
      throw new Error(`El ítem "${item.name}" no tiene configuración de piezas (pieceSpec)`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('La cantidad de piezas debe ser un número entero positivo');
    }

    const currentStock = new Decimal(item.stock.toString());
    const qty = new Decimal(quantity);

    if (currentStock.lt(qty)) {
      throw new Error(`Stock insuficiente para "${item.name}". Disponible: ${currentStock.toString()}, requerido: ${qty.toString()}`);
    }

    const avgCost = new Decimal(item.avgUnitCost.toString());
    const subtotal = qty.mul(avgCost);

    return {
      piecesDeducted: qty,
      unitCostSnapshot: avgCost,
      subtotal,
      remnantCreated: null,
      wasteGenerated: null,
    };
  }

  /**
   * Mode: 'measure' + source: 'whole_piece'
   * Consumes measureUsed from whole pieces in stock.
   * Consumes ceil(measureUsed / pieceSize) pieces.
   * If there is a remainder:
   *   - remainder < minUsableMeasure => waste
   *   - otherwise => remnant available
   */
  static consumeMeasureFromWholePiece(
    item: InventoryItemForConsumption,
    measureUsedInput: Decimal | string | number
  ): ConsumptionResult {
    if (!item.pieceSpec) {
      throw new Error(`El ítem "${item.name}" no tiene configuración de piezas (pieceSpec)`);
    }

    const measureUsed = new Decimal(measureUsedInput.toString());
    if (measureUsed.lte(0)) {
      throw new Error('La medida usada debe ser mayor a 0');
    }

    const pieceSize = new Decimal(item.pieceSpec.pieceSize.toString());
    if (pieceSize.lte(0)) {
      throw new Error('pieceSize debe ser mayor a 0');
    }

    // Pieces needed: ceil(measureUsed / pieceSize)
    const piecesNeeded = measureUsed.div(pieceSize).ceil();
    const currentStock = new Decimal(item.stock.toString());

    if (currentStock.lt(piecesNeeded)) {
      throw new Error(
        `Stock insuficiente de piezas enteras para "${item.name}". Disponibles: ${currentStock.toString()}, requeridas: ${piecesNeeded.toString()}`
      );
    }

    const costPerMeasure = this.getCostPerMeasure(item.avgUnitCost, pieceSize);
    const subtotal = measureUsed.mul(costPerMeasure);

    const totalMeasureTaken = piecesNeeded.mul(pieceSize);
    const remainder = totalMeasureTaken.sub(measureUsed);

    let remnantCreated: RemnantCreatedResult | null = null;
    let wasteGenerated: WasteGeneratedResult | null = null;

    if (remainder.gt(0)) {
      const minUsable = item.pieceSpec.minUsableMeasure !== undefined && item.pieceSpec.minUsableMeasure !== null
        ? new Decimal(item.pieceSpec.minUsableMeasure.toString())
        : null;

      if (minUsable && remainder.lt(minUsable)) {
        // Classify as waste
        wasteGenerated = {
          measure: remainder,
          cost: remainder.mul(costPerMeasure),
          costPerMeasureSnapshot: costPerMeasure,
          manual: false,
        };
      } else {
        // Classify as remnant
        remnantCreated = {
          measure: remainder,
          costPerMeasureSnapshot: costPerMeasure,
        };
      }
    }

    return {
      piecesDeducted: piecesNeeded,
      measureUsed,
      unitCostSnapshot: costPerMeasure,
      subtotal,
      remnantCreated,
      wasteGenerated,
    };
  }

  /**
   * Mode: 'measure' + source: 'remnant'
   * Consumes measureUsed from an existing available remnant.
   * If remainder > 0:
   *   - remainder < minUsableMeasure => waste
   *   - otherwise => child remnant available
   */
  static consumeMeasureFromRemnant(
    item: InventoryItemForConsumption,
    remnant: RemnantForConsumption,
    measureUsedInput: Decimal | string | number
  ): ConsumptionResult {
    if (remnant.status !== 'available') {
      throw new Error('El retazo no está disponible para ser utilizado');
    }

    const measureUsed = new Decimal(measureUsedInput.toString());
    if (measureUsed.lte(0)) {
      throw new Error('La medida usada debe ser mayor a 0');
    }

    const remnantMeasure = new Decimal(remnant.measure.toString());
    if (measureUsed.gt(remnantMeasure)) {
      throw new Error(
        `Medida insuficiente en el retazo. Disponible: ${remnantMeasure.toString()}, requerida: ${measureUsed.toString()}`
      );
    }

    const costPerMeasure = new Decimal(remnant.costPerMeasureSnapshot.toString());
    const subtotal = measureUsed.mul(costPerMeasure);
    const remainder = remnantMeasure.sub(measureUsed);

    let remnantCreated: RemnantCreatedResult | null = null;
    let wasteGenerated: WasteGeneratedResult | null = null;

    if (remainder.gt(0)) {
      const minUsable = item.pieceSpec?.minUsableMeasure !== undefined && item.pieceSpec?.minUsableMeasure !== null
        ? new Decimal(item.pieceSpec.minUsableMeasure.toString())
        : null;

      if (minUsable && remainder.lt(minUsable)) {
        wasteGenerated = {
          measure: remainder,
          cost: remainder.mul(costPerMeasure),
          costPerMeasureSnapshot: costPerMeasure,
          remnant: remnant._id,
          manual: false,
        };
      } else {
        remnantCreated = {
          measure: remainder,
          costPerMeasureSnapshot: costPerMeasure,
          parentRemnant: remnant._id,
        };
      }
    }

    return {
      piecesDeducted: new Decimal(0),
      measureUsed,
      unitCostSnapshot: costPerMeasure,
      subtotal,
      remnantUsedId: remnant._id,
      remnantCreated,
      wasteGenerated,
    };
  }

  /**
   * Mode: 'waste' (manual waste of a remnant in a work)
   */
  static manualWasteFromRemnant(
    remnant: RemnantForConsumption
  ): ConsumptionResult {
    if (remnant.status !== 'available') {
      throw new Error('El retazo no está disponible para descarte');
    }

    const measure = new Decimal(remnant.measure.toString());
    const costPerMeasure = new Decimal(remnant.costPerMeasureSnapshot.toString());
    const cost = measure.mul(costPerMeasure);

    return {
      piecesDeducted: new Decimal(0),
      measureUsed: measure,
      unitCostSnapshot: costPerMeasure,
      subtotal: new Decimal(0),
      remnantUsedId: remnant._id,
      wasteGenerated: {
        measure,
        cost,
        costPerMeasureSnapshot: costPerMeasure,
        remnant: remnant._id,
        manual: true,
      },
    };
  }

  /**
   * Legacy consumption for items without pieceSpec or tools
   */
  static consumeLegacy(
    item: InventoryItemForConsumption,
    quantityInput: Decimal | string | number
  ): ConsumptionResult {
    const qty = new Decimal(quantityInput.toString());
    if (qty.lte(0)) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    const currentStock = new Decimal(item.stock.toString());
    const avgCost = new Decimal(item.avgUnitCost.toString());

    if (item.kind === 'material') {
      if (currentStock.lt(qty)) {
        throw new Error(`Stock insuficiente para "${item.name}". Disponible: ${currentStock.toString()}, requerido: ${qty.toString()}`);
      }
      const subtotal = qty.mul(avgCost);
      return {
        piecesDeducted: qty,
        unitCostSnapshot: avgCost,
        subtotal,
      };
    } else {
      // Tools do not deduct stock or add material cost
      return {
        piecesDeducted: new Decimal(0),
        unitCostSnapshot: new Decimal(0),
        subtotal: new Decimal(0),
      };
    }
  }

  /**
   * Calculates total inventory value for an item (admin only):
   * stock * avgUnitCost + sum(remnant.measure * remnant.costPerMeasureSnapshot)
   */
  static calculateTotalInventoryValue(
    item: InventoryItemForConsumption,
    availableRemnants: RemnantForConsumption[]
  ): Decimal {
    const stockVal = new Decimal(item.stock.toString()).mul(new Decimal(item.avgUnitCost.toString()));
    const remnantsVal = availableRemnants.reduce((acc, r) => {
      if (r.status !== 'available') return acc;
      return acc.add(new Decimal(r.measure.toString()).mul(new Decimal(r.costPerMeasureSnapshot.toString())));
    }, new Decimal(0));

    return stockVal.add(remnantsVal);
  }
}
