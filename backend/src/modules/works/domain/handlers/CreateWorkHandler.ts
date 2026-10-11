import { Decimal } from 'decimal.js';
import { Work, IWork } from '../../../../models/Work';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import {
  PieceConsumptionService,
  WASTE_CHARGED_TO_PROFIT,
} from '../../../inventory/domain/PieceConsumptionService';

export class CreateWorkHandler implements IChangeHandler {
  entity = 'work';
  action = 'create';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;

    // Admin can override chargedPrice when approving
    const finalChargedPrice = overrides?.chargedPrice !== undefined ? overrides.chargedPrice : payload.chargedPrice;

    // Fix Bug C (Obras duplicadas): if request.targetId exists, update the existing pending work!
    let work: any;
    if (request.targetId) {
      work = await Work.findById(request.targetId).session(tx);
    }

    if (!work) {
      work = new Work({
        clientName: payload.clientName,
        description: payload.description || '',
        performedAt: new Date(payload.performedAt),
        createdBy: request.requestedBy,
      });
    }

    work.clientName = payload.clientName;
    work.description = payload.description || '';
    work.performedAt = new Date(payload.performedAt);
    work.chargedPrice = finalChargedPrice !== undefined ? new Decimal(finalChargedPrice).toString() : undefined;
    work.status = 'approved';
    work.approvedBy = ctx.actorId;

    let totalMaterialsCost = new Decimal(0);
    let totalWasteCost = new Decimal(0);
    const workItems: any[] = [];
    const workWaste: any[] = [];

    // Process items (subtract stock, calculate costs, handle pieces / remnants / waste)
    if (payload.items && payload.items.length > 0) {
      for (const line of payload.items) {
        const itemDoc = await InventoryItem.findById(line.item).session(tx);
        if (!itemDoc) throw new Error(`Ítem ${line.item} no encontrado`);

        // Check if item has piece tracking
        if (itemDoc.pieceSpec && line.mode) {
          // --- CASE A: ITEM WITH PIECES TRACKING ---

          if (line.mode === 'pieces') {
            // Mode: whole pieces (e.g. 2 tubes)
            const res = PieceConsumptionService.consumeWholePieces(itemDoc as any, line.quantity);
            const currentStock = new Decimal(itemDoc.stock.toString());
            itemDoc.stock = currentStock.sub(res.piecesDeducted).toString() as any;
            await itemDoc.save({ session: tx });

            totalMaterialsCost = totalMaterialsCost.add(res.subtotal);

            workItems.push({
              item: itemDoc._id,
              kind: itemDoc.kind,
              mode: 'pieces',
              piecesConsumed: res.piecesDeducted.toString(),
              quantity: res.piecesDeducted.toString(),
              unitCostSnapshot: res.unitCostSnapshot.toString(),
              subtotal: res.subtotal.toString(),
            });

            await InventoryMovement.create([{
              item: itemDoc._id,
              type: 'cut',
              quantity: res.piecesDeducted.negated().toString(),
              work: work._id,
              createdBy: request.requestedBy,
              approvedBy: ctx.actorId,
              note: `Consumo de ${res.piecesDeducted.toString()} pieza(s) entera(s)`,
            }], { session: tx });

          } else if (line.mode === 'measure' && line.source === 'whole_piece') {
            // Mode: measure from whole piece (e.g. 2.7m of a 3m tube)
            const res = PieceConsumptionService.consumeMeasureFromWholePiece(itemDoc as any, line.measureUsed);
            const currentStock = new Decimal(itemDoc.stock.toString());
            itemDoc.stock = currentStock.sub(res.piecesDeducted).toString() as any;
            await itemDoc.save({ session: tx });

            totalMaterialsCost = totalMaterialsCost.add(res.subtotal);
            const remnantsCreatedForLine: any[] = [];

            if (res.remnantCreated) {
              const [newRemnant] = await Remnant.create([{
                item: itemDoc._id,
                measure: res.remnantCreated.measure.toString(),
                costPerMeasureSnapshot: res.remnantCreated.costPerMeasureSnapshot.toString(),
                status: 'available',
                originWork: work._id,
                createdBy: request.requestedBy,
                approvedBy: ctx.actorId,
              }], { session: tx });
              remnantsCreatedForLine.push(newRemnant._id);
            }

            if (res.wasteGenerated) {
              workWaste.push({
                item: itemDoc._id,
                subcategory: itemDoc.subcategory,
                measure: res.wasteGenerated.measure.toString(),
                measureUnit: itemDoc.pieceSpec.measureUnit,
                costPerMeasureSnapshot: res.wasteGenerated.costPerMeasureSnapshot.toString(),
                cost: res.wasteGenerated.cost.toString(),
                manual: false,
                note: `Sobrante menor al mínimo usable (${res.wasteGenerated.measure.toString()})`,
              });
              totalWasteCost = totalWasteCost.add(res.wasteGenerated.cost);

              await InventoryMovement.create([{
                item: itemDoc._id,
                type: 'waste',
                quantity: '0',
                measureUsed: res.wasteGenerated.measure.toString(),
                totalCost: res.wasteGenerated.cost.toString(),
                work: work._id,
                createdBy: request.requestedBy,
                approvedBy: ctx.actorId,
                note: 'Merma automática por corte en obra',
              }], { session: tx });
            }

            workItems.push({
              item: itemDoc._id,
              kind: itemDoc.kind,
              mode: 'measure',
              source: 'whole_piece',
              measureUsed: res.measureUsed!.toString(),
              piecesConsumed: res.piecesDeducted.toString(),
              remnantsCreated: remnantsCreatedForLine,
              unitCostSnapshot: res.unitCostSnapshot.toString(),
              subtotal: res.subtotal.toString(),
            });

            await InventoryMovement.create([{
              item: itemDoc._id,
              type: 'cut',
              quantity: res.piecesDeducted.negated().toString(),
              measureUsed: res.measureUsed!.toString(),
              work: work._id,
              createdBy: request.requestedBy,
              approvedBy: ctx.actorId,
              note: `Corte de ${res.measureUsed!.toString()} desde ${res.piecesDeducted.toString()} pieza(s) entera(s)`,
            }], { session: tx });

          } else if (line.mode === 'measure' && line.source === 'remnant') {
            // Mode: measure from existing remnant (P9: atomic acquisition)
            const remnantDoc = await Remnant.findOneAndUpdate(
              { _id: line.remnant, status: 'available' },
              { $set: { status: 'used', usedInWork: work._id } },
              { session: tx }
            );

            if (!remnantDoc) {
              throw new Error('El retazo seleccionado no está disponible o ya fue utilizado por otra obra.');
            }

            const res = PieceConsumptionService.consumeMeasureFromRemnant(itemDoc as any, remnantDoc as any, line.measureUsed);
            totalMaterialsCost = totalMaterialsCost.add(res.subtotal);
            const remnantsCreatedForLine: any[] = [];

            if (res.remnantCreated) {
              const [childRemnant] = await Remnant.create([{
                item: itemDoc._id,
                measure: res.remnantCreated.measure.toString(),
                costPerMeasureSnapshot: res.remnantCreated.costPerMeasureSnapshot.toString(),
                status: 'available',
                originWork: work._id,
                parentRemnant: remnantDoc._id,
                createdBy: request.requestedBy,
                approvedBy: ctx.actorId,
              }], { session: tx });
              remnantsCreatedForLine.push(childRemnant._id);
            }

            if (res.wasteGenerated) {
              workWaste.push({
                item: itemDoc._id,
                subcategory: itemDoc.subcategory,
                measure: res.wasteGenerated.measure.toString(),
                measureUnit: itemDoc.pieceSpec.measureUnit,
                costPerMeasureSnapshot: res.wasteGenerated.costPerMeasureSnapshot.toString(),
                cost: res.wasteGenerated.cost.toString(),
                remnant: remnantDoc._id,
                manual: false,
                note: `Sobrante de retazo menor al mínimo usable (${res.wasteGenerated.measure.toString()})`,
              });
              totalWasteCost = totalWasteCost.add(res.wasteGenerated.cost);

              await InventoryMovement.create([{
                item: itemDoc._id,
                type: 'waste',
                quantity: '0',
                measureUsed: res.wasteGenerated.measure.toString(),
                totalCost: res.wasteGenerated.cost.toString(),
                remnant: remnantDoc._id,
                work: work._id,
                createdBy: request.requestedBy,
                approvedBy: ctx.actorId,
                note: 'Merma de retazo por corte en obra',
              }], { session: tx });
            }

            workItems.push({
              item: itemDoc._id,
              kind: itemDoc.kind,
              mode: 'measure',
              source: 'remnant',
              remnant: remnantDoc._id,
              measureUsed: res.measureUsed!.toString(),
              remnantsCreated: remnantsCreatedForLine,
              unitCostSnapshot: res.unitCostSnapshot.toString(),
              subtotal: res.subtotal.toString(),
            });

            await InventoryMovement.create([{
              item: itemDoc._id,
              type: 'remnant_consumption',
              quantity: '0',
              measureUsed: res.measureUsed!.toString(),
              remnant: remnantDoc._id,
              work: work._id,
              createdBy: request.requestedBy,
              approvedBy: ctx.actorId,
              note: `Consumo de ${res.measureUsed!.toString()} desde retazo`,
            }], { session: tx });

          } else if (line.mode === 'waste') {
            // Mode: manual waste of a damaged remnant in work
            const remnantDoc = await Remnant.findOneAndUpdate(
              { _id: line.remnant, status: 'available' },
              { $set: { status: 'discarded', usedInWork: work._id } },
              { session: tx }
            );

            if (!remnantDoc) {
              throw new Error('El retazo a descartar no está disponible.');
            }

            const res = PieceConsumptionService.manualWasteFromRemnant(remnantDoc as any);
            workWaste.push({
              item: itemDoc._id,
              subcategory: itemDoc.subcategory,
              measure: res.wasteGenerated!.measure.toString(),
              measureUnit: itemDoc.pieceSpec.measureUnit,
              costPerMeasureSnapshot: res.wasteGenerated!.costPerMeasureSnapshot.toString(),
              cost: res.wasteGenerated!.cost.toString(),
              remnant: remnantDoc._id,
              manual: true,
              note: line.note || 'Merma manual registrada en obra',
            });
            totalWasteCost = totalWasteCost.add(res.wasteGenerated!.cost);

            await InventoryMovement.create([{
              item: itemDoc._id,
              type: 'waste',
              quantity: '0',
              measureUsed: res.wasteGenerated!.measure.toString(),
              totalCost: res.wasteGenerated!.cost.toString(),
              remnant: remnantDoc._id,
              work: work._id,
              createdBy: request.requestedBy,
              approvedBy: ctx.actorId,
              note: line.note || 'Merma manual en obra',
            }], { session: tx });
          }

        } else {
          // --- CASE B: LEGACY ITEM (NO PIECE SPEC) OR TOOL ---
          const quantity = line.quantity !== undefined ? line.quantity : line.measureUsed;
          const res = PieceConsumptionService.consumeLegacy(itemDoc as any, quantity);

          if (itemDoc.kind === 'material') {
            const currentStock = new Decimal(itemDoc.stock.toString());
            itemDoc.stock = currentStock.sub(res.piecesDeducted).toString() as any;
            await itemDoc.save({ session: tx });

            totalMaterialsCost = totalMaterialsCost.add(res.subtotal);

            workItems.push({
              item: itemDoc._id,
              kind: itemDoc.kind,
              quantity: res.piecesDeducted.toString(),
              unitCostSnapshot: res.unitCostSnapshot.toString(),
              subtotal: res.subtotal.toString(),
            });

            await InventoryMovement.create([{
              item: itemDoc._id,
              type: 'work_consumption',
              quantity: res.piecesDeducted.negated().toString(),
              work: work._id,
              createdBy: request.requestedBy,
              approvedBy: ctx.actorId,
            }], { session: tx });

          } else {
            // Tool
            workItems.push({
              item: itemDoc._id,
              kind: itemDoc.kind,
              quantity: new Decimal(quantity).toString(),
            });
          }
        }
      }
    }

    work.items = workItems as any;
    work.materialsCost = totalMaterialsCost.toString() as any;
    work.waste = workWaste as any;
    work.wasteCost = totalWasteCost.toString() as any;

    if (finalChargedPrice !== undefined) {
      // Option 1: profit = chargedPrice - materialsCost - wasteCost
      const profit = new Decimal(finalChargedPrice)
        .sub(totalMaterialsCost)
        .sub(WASTE_CHARGED_TO_PROFIT ? totalWasteCost : new Decimal(0));
      work.profit = profit.toString() as any;
    }

    await work.save({ session: tx });
    return work;
  }
}

changeHandlerRegistry.register(new CreateWorkHandler());
