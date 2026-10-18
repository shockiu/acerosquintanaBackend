import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import type { ChangeRequest } from '../schemas/approvals.schema';
import { ShoppingCart, Package, Info, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function ApproveSaleDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ChangeRequest;
}) {
  const { mutate: approve, isPending } = useApproveRequest();
  const { data: inventoryData } = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : ((inventoryData as any)?.items ?? []);

  const payload = request.payload || {};
  const items = payload.items || [];

  // Map item id -> unitPrice
  const [prices, setPrices] = useState<Record<string, number | ''>>(() => {
    const initial: Record<string, number | ''> = {};
    for (const it of items) {
      const itemId = it.item?._id || it.item;
      initial[itemId] = it.unitPrice || '';
    }
    return initial;
  });

  const handlePriceChange = (itemId: string, val: string) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: val === '' ? '' : Number(val),
    }));
  };

  const buyerName = payload.buyerName || request.targetName || 'Cliente Particular';

  // Calculate live total sale
  let totalCalculated = 0;
  for (const it of items) {
    const itemId = it.item?._id || it.item;
    const price = Number(prices[itemId] || 0);
    const qty = Number(it.quantity || 0);
    totalCalculated += qty * price;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that all items have a valid unit price > 0
    const overrideItems: { item: string; unitPrice: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemId = it.item?._id || it.item;
      const price = Number(prices[itemId]);

      if (prices[itemId] === '' || isNaN(price) || price <= 0) {
        toast.error(`Debes fijar un precio de venta mayor a 0 para el ítem #${i + 1}`);
        return;
      }

      overrideItems.push({
        item: itemId,
        unitPrice: price,
      });
    }

    approve(
      {
        id: request._id,
        overrides: {
          items: overrideItems,
        },
      },
      {
        onSuccess: () => {
          toast.success('Venta aprobada, precios fijados y stock descontado exitosamente');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto w-full">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Aprobar Venta y Asignar Precios</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                El operario registró la salida de mercancía. Como administrador, fija los precios unitarios para formalizar la venta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Request Header Summary */}
        <div className="rounded-xl border bg-muted/30 p-3.5 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cliente / Comprador:</span>
            <span className="font-bold text-foreground text-sm">{buyerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Operario Solicitante:</span>
            <span className="font-medium text-foreground">
              {request.requestedBy?.name || request.requestedBy?.email || 'Operario'}
            </span>
          </div>
          {payload.notes && (
            <div className="pt-1.5 border-t text-[11px] text-muted-foreground">
              <strong className="text-foreground">Notas:</strong> {payload.notes}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Ítems a Facturar ({items.length})
              </Label>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Total Venta: ${totalCalculated.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 h-9 text-[11px]">
                    <TableHead className="font-semibold">Ítem / Producto</TableHead>
                    <TableHead className="text-center font-semibold">Cant. Vendida</TableHead>
                    <TableHead className="text-right font-semibold">Costo Inventario</TableHead>
                    <TableHead className="text-right font-semibold w-40">Precio Venta Unit. $ *</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it: any, idx: number) => {
                    const itemId = it.item?._id || it.item;
                    const inv = inventoryItems.find((i: any) => i._id === itemId);
                    const itemName = it.name || inv?.name || 'Ítem';
                    const itemKind = it.kind || inv?.kind || 'material';
                    const qty = Number(it.quantity || 0);
                    const unitSym = it.unitSymbol || (inv?.pieceSpec ? 'pz' : 'unid.');
                    const cost = inv?.avgUnitCost != null ? Number(inv.avgUnitCost) : (it.avgUnitCost != null ? Number(it.avgUnitCost) : 0);
                    const currentStock = inv?.stock != null ? Number(inv.stock) : (it.currentStock != null ? Number(it.currentStock) : 0);
                    const priceVal = prices[itemId] ?? '';

                    return (
                      <TableRow key={idx} className="h-12 text-xs">
                        <TableCell className="font-medium">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{itemName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted font-mono text-muted-foreground">
                                {itemKind === 'tool' ? 'Herramienta' : 'Material'}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block">
                              Stock actual: {currentStock} {unitSym}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {qty} {unitSym}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">
                          ${cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={priceVal}
                            onChange={e => handlePriceChange(itemId, e.target.value)}
                            placeholder="0.00"
                            className="h-8 text-xs font-bold text-right font-mono"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl border text-[11px] text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Al aprobar, se descontará el stock de cada ítem, se generará el folio oficial de venta y se registrarán las ganancias netas.</span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isPending ? 'Procesando...' : 'Aprobar y Registrar Venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
