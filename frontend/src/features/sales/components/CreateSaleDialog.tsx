import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import { useCreateSale } from '../hooks/useSalesData';
import { useAuth } from '@/features/auth/AuthContext';
import { 
  Plus, 
  Trash2, 
  Package, 
  Wrench, 
  ShoppingCart, 
  AlertTriangle, 
  Info,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

interface SaleLineState {
  item: string;
  quantity: number | '';
  unitPrice: number | '';
  unitCost: number | '';
  unitSymbol?: string;
}

export default function CreateSaleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';

  const { data: inventoryData } = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : ((inventoryData as any)?.items ?? []);

  const { mutate: createSale, isPending } = useCreateSale();

  const [buyerName, setBuyerName] = useState('');
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<SaleLineState[]>([
    { item: '', quantity: 1, unitPrice: '', unitCost: '' },
  ]);

  const handleAddItemLine = () => {
    setLines(prev => [...prev, { item: '', quantity: 1, unitPrice: '', unitCost: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      toast.info('Debe haber al menos un ítem en la venta');
      return;
    }
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = inventoryItems.find((inv: any) => inv._id === itemId);
    const avgCost = selectedItem?.avgUnitCost != null 
      ? Number(typeof selectedItem.avgUnitCost === 'object' && '$numberDecimal' in selectedItem.avgUnitCost 
          ? selectedItem.avgUnitCost.$numberDecimal 
          : selectedItem.avgUnitCost) 
      : 0;

    const unitSymbol = (selectedItem?.pieceSpec?.measureUnit as any)?.symbol || (selectedItem?.pieceSpec ? 'pz' : 'unid.');

    setLines(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        item: itemId,
        unitCost: avgCost || 0,
        unitSymbol,
      };
      return copy;
    });
  };

  const handleLineChange = (index: number, patch: Partial<SaleLineState>) => {
    setLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  // Financial calculations
  let totalRevenue = 0;
  let totalCost = 0;
  let hasStockError = false;

  const calculatedLines = lines.map((l) => {
    const inv = inventoryItems.find((i: any) => i._id === l.item);
    const qty = Number(l.quantity || 0);
    const price = Number(l.unitPrice || 0);
    const cost = Number(l.unitCost || 0);
    const currentStock = Number(inv?.stock ?? 0);

    const subtotalRevenue = qty * price;
    const subtotalCost = qty * cost;
    const profit = subtotalRevenue - subtotalCost;

    const isExceeded = l.item ? qty > currentStock : false;
    if (isExceeded) hasStockError = true;

    totalRevenue += subtotalRevenue;
    totalCost += subtotalCost;

    return {
      ...l,
      inv,
      qty,
      price,
      cost,
      currentStock,
      subtotalRevenue,
      subtotalCost,
      profit,
      isExceeded,
    };
  });

  const netProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerName.trim()) {
      toast.error('Indica el nombre del comprador o cliente');
      return;
    }

    if (lines.length === 0) {
      toast.error('Agrega al menos un ítem');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.item) {
        toast.error(`Selecciona un ítem en la fila #${i + 1}`);
        return;
      }
      const qty = Number(line.quantity);
      if (!qty || qty <= 0) {
        toast.error(`Cantidad inválida en la fila #${i + 1}`);
        return;
      }
      const inv = inventoryItems.find((it: any) => it._id === line.item);
      const stock = Number(inv?.stock ?? 0);
      if (qty > stock) {
        toast.error(`Stock insuficiente para "${inv?.name}" en la fila #${i + 1} (disponibles: ${stock})`);
        return;
      }
      if (isAdmin && (line.unitPrice === '' || Number(line.unitPrice) < 0)) {
        toast.error(`Indica el precio de venta en la fila #${i + 1}`);
        return;
      }
    }

    createSale(
      {
        buyerName: buyerName.trim(),
        performedAt: new Date(performedAt).toISOString(),
        notes: notes.trim() || undefined,
        items: lines.map(l => {
          const inv = inventoryItems.find((i: any) => i._id === l.item);
          return {
            item: l.item,
            name: inv?.name || '',
            quantity: Number(l.quantity),
            unitPrice: isAdmin ? Number(l.unitPrice) : 0,
            unitCost: isAdmin && l.unitCost !== '' ? Number(l.unitCost) : undefined,
            unitSymbol: l.unitSymbol,
          };
        }),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setBuyerName('');
          setNotes('');
          setLines([{ item: '', quantity: 1, unitPrice: '', unitCost: '' }]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Registrar Nueva Venta Directa</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Vende materiales o herramientas del taller, indicando el precio de venta y de compra para descontar stock y calcular ganancias.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {!isAdmin && (
            <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Como usuario operario, esta venta se enviará a aprobación previa del administrador para asignar precios y concretar el descuento de inventario.</span>
            </div>
          )}

          {/* General Sale Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl border">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Cliente / Comprador *</Label>
              <Input
                required
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                placeholder="Ej. Distribuidora Gómez o Cliente Particular"
                className="bg-background text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha de Operación</Label>
              <Input
                type="date"
                required
                value={performedAt}
                onChange={e => setPerformedAt(e.target.value)}
                className="bg-background text-sm"
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label className="text-xs font-semibold">Observaciones / N° Comprobante (Opcional)</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Factura #402, entregado en mano, pago transferencia..."
                className="bg-background text-xs"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Ítems a Vender ({lines.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemLine}
                className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Ítem
              </Button>
            </div>

            <div className="space-y-2">
              {calculatedLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs space-y-2 transition-colors ${
                    line.isExceeded ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/40 border-border'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    {/* Item Selector */}
                    <div className={`${isAdmin ? 'sm:col-span-5' : 'sm:col-span-8'} space-y-1`}>
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Ítem #{idx + 1} *
                      </Label>
                      <select
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={line.item}
                        onChange={e => handleItemSelect(idx, e.target.value)}
                      >
                        <option value="">Selecciona un material o herramienta...</option>
                        {inventoryItems.map((inv: any) => (
                          <option key={inv._id} value={inv._id}>
                            [{inv.kind === 'tool' ? 'Herramienta' : 'Material'}] {inv.name} (Stock: {Number(inv.stock ?? 0)})
                          </option>
                        ))}
                      </select>
                      {line.inv && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                          <span className="font-semibold text-foreground">{line.inv.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono">
                            {line.inv.kind === 'tool' ? 'Herramienta' : 'Material'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className={`${isAdmin ? 'sm:col-span-2' : 'sm:col-span-3'} space-y-1`}>
                      <div className="flex justify-between items-center">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Cantidad *
                        </Label>
                        {line.inv && (
                          <span className={`text-[10px] font-mono ${line.isExceeded ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            Disp: {line.currentStock}
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={line.quantity}
                        onChange={e => handleLineChange(idx, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="Ej. 1"
                        className={`h-9 text-xs bg-background ${line.isExceeded ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                    </div>

                    {/* Unit Cost & Price (Admin Only) */}
                    {isAdmin && (
                      <>
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Costo Compra $
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={e => handleLineChange(idx, { unitCost: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder="0.00"
                            className="h-9 text-xs bg-background"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Precio Venta $ *
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={line.unitPrice}
                            onChange={e => handleLineChange(idx, { unitPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder="Ej. 25.00"
                            className="h-9 text-xs bg-background font-semibold"
                          />
                        </div>
                      </>
                    )}

                    {/* Delete button */}
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLine(idx)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Line financial & stock status bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-[11px]">
                    <div className="flex items-center gap-2">
                      {line.inv?.kind === 'tool' ? (
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                          <Wrench className="h-2.5 w-2.5 mr-1" />
                          Herramienta
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5">
                          <Package className="h-2.5 w-2.5 mr-1" />
                          Material
                        </Badge>
                      )}

                      {line.isExceeded && (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          ¡Supera el stock actual de {line.currentStock}!
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          Costo: <strong>${line.subtotalCost.toFixed(2)}</strong>
                        </span>
                        <span className="text-primary">
                          Total Venta: <strong>${line.subtotalRevenue.toFixed(2)}</strong>
                        </span>
                        <span className={line.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-destructive font-semibold'}>
                          Ganancia: {line.profit >= 0 ? '+' : ''}${line.profit.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Financial Summary Card (Admin Only) */}
          {isAdmin && (
            <div className="p-3.5 bg-gradient-to-r from-muted/50 to-muted/80 rounded-xl border space-y-2">
              <span className="text-xs font-bold text-foreground block">
                Resumen Financiero de la Venta
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-background/80 p-2.5 rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Total Cobrado (Venta)</span>
                  <span className="text-base font-bold text-primary">
                    ${totalRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="bg-background/80 p-2.5 rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Costo de Adquisición</span>
                  <span className="text-base font-bold text-muted-foreground">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="bg-background/80 p-2.5 rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Ganancia Neta</span>
                  <span className={`text-base font-bold ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    ${netProfit.toFixed(2)}
                  </span>
                </div>
                <div className="bg-background/80 p-2.5 rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Margen de Ganancia</span>
                  <span className="text-base font-bold text-foreground">
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                Al confirmar, las unidades se descontarán inmediatamente del stock y se registrará la venta con comprobante interno.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={isPending || hasStockError}
              className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? 'Enviando...' : isAdmin ? 'Completar y Descontar Stock' : 'Enviar Solicitud de Venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
