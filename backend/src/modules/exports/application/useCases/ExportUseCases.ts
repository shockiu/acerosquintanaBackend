import ExcelJS from 'exceljs';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Work } from '../../../../models/Work';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';

export class ExportUseCases {
  static async exportInventory(ctx: ActionContext): Promise<ExcelJS.Workbook> {
    const items = await InventoryItem.find().populate({
      path: 'subcategory',
      populate: [
        { path: 'category' },
        { path: 'unit' }
      ]
    }).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventario');

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Subcategoría', key: 'subcategory', width: 20 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Tipo', key: 'kind', width: 15 },
      { header: 'Stock', key: 'stock', width: 15 },
      { header: 'Unidad', key: 'unit', width: 15 },
    ];

    if (ctx.role === 'admin') {
      columns.push({ header: 'Costo Unit. Promedio', key: 'avgUnitCost', width: 20 });
      columns.push({ header: 'Valor Total', key: 'totalValue', width: 20 });
    }

    sheet.columns = columns;

    const serializedItems = RoleSerializer.serialize(items, ctx.role);

    for (const item of serializedItems) {
      const row: any = {
        category: (item.subcategory as any)?.category?.name || '',
        subcategory: (item.subcategory as any)?.name || '',
        item: item.name,
        kind: item.kind === 'material' ? 'Material' : 'Herramienta',
        stock: item.stock,
        unit: (item.subcategory as any)?.unit?.symbol || '',
      };

      if (ctx.role === 'admin') {
        row.avgUnitCost = item.avgUnitCost;
        row.totalValue = (parseFloat(item.stock) * parseFloat(item.avgUnitCost)).toFixed(2);
      }

      sheet.addRow(row);
    }

    // Format headers
    sheet.getRow(1).font = { bold: true };
    return workbook;
  }

  static async exportWorks(ctx: ActionContext): Promise<ExcelJS.Workbook> {
    const works = await Work.find().sort({ performedAt: -1 }).lean();
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Obras');

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Cliente', key: 'client', width: 25 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Estado', key: 'status', width: 20 },
    ];

    if (ctx.role === 'admin') {
      columns.push({ header: 'Cobrado', key: 'chargedPrice', width: 15 });
      columns.push({ header: 'Costo Materiales', key: 'materialsCost', width: 15 });
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
        row.profit = w.profit || 0;
      }

      sheet.addRow(row);
    }

    sheet.getRow(1).font = { bold: true };
    return workbook;
  }
}
