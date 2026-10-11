import ExcelJS from 'exceljs';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Work } from '../../../../models/Work';
import { Remnant } from '../../../../models/Remnant';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';
import { Decimal } from 'decimal.js';

export class ExportUseCases {
  static async exportInventory(ctx: ActionContext): Promise<ExcelJS.Workbook> {
    const items = await InventoryItem.find().populate({
      path: 'subcategory',
      populate: [
        { path: 'category' },
        { path: 'unit' }
      ]
    }).populate('pieceSpec.measureUnit').lean();

    const remnants = await Remnant.find()
      .populate('item')
      .populate('originWork')
      .lean();

    const workbook = new ExcelJS.Workbook();

    // --- SHEET 1: INVENTARIO ---
    const sheet = workbook.addWorksheet('Inventario');

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Subcategoría', key: 'subcategory', width: 20 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Tipo', key: 'kind', width: 15 },
      { header: 'Stock', key: 'stock', width: 15 },
      { header: 'Unidad', key: 'unit', width: 15 },
      { header: 'Seguimiento Piezas', key: 'pieceTracking', width: 20 },
      { header: 'Retazos Disp.', key: 'remnantsCount', width: 15 },
      { header: 'Medida Retazos', key: 'remnantsMeasure', width: 18 },
      { header: 'Medida Total Disp.', key: 'totalMeasure', width: 20 },
    ];

    if (ctx.role === 'admin') {
      columns.push({ header: 'Costo Unit. Promedio', key: 'avgUnitCost', width: 20 });
      columns.push({ header: 'Valor Total Inventario', key: 'totalValue', width: 22 });
    }

    sheet.columns = columns;

    const serializedItems = RoleSerializer.serialize(items, ctx.role);

    for (const item of serializedItems) {
      const itemRemnants = remnants.filter(
        (r: any) => r.item?._id?.toString() === item._id?.toString() && r.status === 'available'
      );

      const remnantsCount = itemRemnants.length;
      const remnantsMeasure = itemRemnants.reduce(
        (acc: number, r: any) => acc + parseFloat(r.measure?.toString() || '0'),
        0
      );

      let pieceTracking = 'No';
      let totalMeasure = '-';
      if (item.pieceSpec) {
        const pieceSize = parseFloat(item.pieceSpec.pieceSize?.toString() || '0');
        const unitSymbol = (item.pieceSpec.measureUnit as any)?.symbol || 'm';
        pieceTracking = `Piezas de ${pieceSize} ${unitSymbol}`;
        const wholeMeasure = parseFloat(item.stock?.toString() || '0') * pieceSize;
        totalMeasure = `${(wholeMeasure + remnantsMeasure).toFixed(2)} ${unitSymbol}`;
      }

      const row: any = {
        category: (item.subcategory as any)?.category?.name || '',
        subcategory: (item.subcategory as any)?.name || '',
        item: item.name,
        kind: item.kind === 'material' ? 'Material' : 'Herramienta',
        stock: item.stock,
        unit: (item.subcategory as any)?.unit?.symbol || '',
        pieceTracking,
        remnantsCount: item.pieceSpec ? remnantsCount : '-',
        remnantsMeasure: item.pieceSpec ? remnantsMeasure.toFixed(2) : '-',
        totalMeasure,
      };

      if (ctx.role === 'admin') {
        const stockCost = parseFloat(item.stock || '0') * parseFloat(item.avgUnitCost || '0');
        const remnantsValue = itemRemnants.reduce((acc: number, r: any) => {
          return acc + parseFloat(r.measure?.toString() || '0') * parseFloat(r.costPerMeasureSnapshot?.toString() || '0');
        }, 0);

        row.avgUnitCost = item.avgUnitCost;
        row.totalValue = (stockCost + remnantsValue).toFixed(2);
      }

      sheet.addRow(row);
    }
    sheet.getRow(1).font = { bold: true };

    // --- SHEET 2: RETAZOS ---
    const remnantsSheet = workbook.addWorksheet('Retazos');
    const remnantsColumns: Partial<ExcelJS.Column>[] = [
      { header: 'Material', key: 'item', width: 30 },
      { header: 'Medida', key: 'measure', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Obra de Origen', key: 'originWork', width: 25 },
      { header: 'Fecha Registro', key: 'createdAt', width: 15 },
    ];

    if (ctx.role === 'admin') {
      remnantsColumns.push({ header: 'Costo / Medida', key: 'costPerMeasure', width: 18 });
      remnantsColumns.push({ header: 'Valor Retazo', key: 'totalValue', width: 18 });
    }

    remnantsSheet.columns = remnantsColumns;

    const serializedRemnants = RoleSerializer.serialize(remnants, ctx.role);
    for (const r of serializedRemnants) {
      const statusLabels: Record<string, string> = {
        available: 'Disponible',
        used: 'Utilizado',
        discarded: 'Descartado',
      };

      const row: any = {
        item: (r.item as any)?.name || 'Material',
        measure: parseFloat(r.measure?.toString() || '0').toFixed(2),
        status: statusLabels[r.status] || r.status,
        originWork: (r.originWork as any)?.clientName || '-',
        createdAt: new Date(r.createdAt).toLocaleDateString(),
      };

      if (ctx.role === 'admin') {
        const costPerM = parseFloat(r.costPerMeasureSnapshot?.toString() || '0');
        const val = parseFloat(r.measure?.toString() || '0') * costPerM;
        row.costPerMeasure = costPerM.toFixed(2);
        row.totalValue = val.toFixed(2);
      }

      remnantsSheet.addRow(row);
    }
    remnantsSheet.getRow(1).font = { bold: true };

    return workbook;
  }

  static async exportWorks(ctx: ActionContext): Promise<ExcelJS.Workbook> {
    const works = await Work.find()
      .populate('items.item')
      .populate('waste.item')
      .populate('waste.subcategory')
      .populate('waste.measureUnit')
      .sort({ performedAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();

    // --- SHEET 1: OBRAS ---
    const sheet = workbook.addWorksheet('Obras');

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Cliente', key: 'client', width: 25 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Estado', key: 'status', width: 20 },
    ];

    if (ctx.role === 'admin') {
      columns.push({ header: 'Cobrado', key: 'chargedPrice', width: 15 });
      columns.push({ header: 'Costo Materiales', key: 'materialsCost', width: 18 });
      columns.push({ header: 'Costo Merma', key: 'wasteCost', width: 15 });
      columns.push({ header: 'Ganancia', key: 'profit', width: 15 });
    }

    sheet.columns = columns;

    const serializedWorks = RoleSerializer.serialize(works, ctx.role);

    for (const w of serializedWorks) {
      const row: any = {
        client: w.clientName,
        description: w.description,
        date: new Date(w.performedAt).toLocaleDateString(),
        status: w.status,
      };

      if (ctx.role === 'admin') {
        row.chargedPrice = w.chargedPrice || 0;
        row.materialsCost = w.materialsCost || 0;
        row.wasteCost = w.wasteCost || 0;
        row.profit = w.profit || 0;
      }

      sheet.addRow(row);
    }
    sheet.getRow(1).font = { bold: true };

    // --- SHEET 2: MERMA ---
    const wasteSheet = workbook.addWorksheet('Merma');
    const wasteColumns: Partial<ExcelJS.Column>[] = [
      { header: 'Obra', key: 'work', width: 25 },
      { header: 'Fecha Obra', key: 'date', width: 15 },
      { header: 'Material', key: 'item', width: 30 },
      { header: 'Subcategoría', key: 'subcategory', width: 20 },
      { header: 'Medida', key: 'measure', width: 15 },
      { header: 'Unidad', key: 'unit', width: 10 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Nota', key: 'note', width: 30 },
    ];

    if (ctx.role === 'admin') {
      wasteColumns.push({ header: 'Costo / Medida', key: 'costPerMeasure', width: 18 });
      wasteColumns.push({ header: 'Costo Merma Total', key: 'cost', width: 18 });
    }

    wasteSheet.columns = wasteColumns;

    for (const w of serializedWorks) {
      if (w.waste && w.waste.length > 0) {
        for (const wasteItem of w.waste) {
          const row: any = {
            work: w.clientName,
            date: new Date(w.performedAt).toLocaleDateString(),
            item: (wasteItem.item as any)?.name || 'Material',
            subcategory: (wasteItem.subcategory as any)?.name || '-',
            measure: parseFloat(wasteItem.measure?.toString() || '0').toFixed(2),
            unit: (wasteItem.measureUnit as any)?.symbol || 'm',
            type: wasteItem.manual ? 'Manual' : 'Automática (Corte)',
            note: wasteItem.note || '',
          };

          if (ctx.role === 'admin') {
            row.costPerMeasure = parseFloat(wasteItem.costPerMeasureSnapshot?.toString() || '0').toFixed(2);
            row.cost = parseFloat(wasteItem.cost?.toString() || '0').toFixed(2);
          }

          wasteSheet.addRow(row);
        }
      }
    }
    wasteSheet.getRow(1).font = { bold: true };

    return workbook;
  }
}
