import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { RotateCcw, Package, AlertTriangle, Scissors, Calendar, User } from 'lucide-react';
import type { ChangeRequest } from '../schemas/approvals.schema';

function parseDecimal(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === 'object') {
    if ('$numberDecimal' in val) {
      const parsed = parseFloat(val.$numberDecimal);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof val.toString === 'function') {
      const s = val.toString();
      if (s && s !== '[object Object]') {
        const parsed = parseFloat(s);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  return 0;
}

export default function ApproveReversalDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ChangeRequest;
}) {
  const { mutate: approve, isPending } = useApproveRequest();

  const handleConfirm = () => {
    approve(
      { id: request._id, overrides: {} },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const p = request.payload || {};
  const doc = request.targetDoc || {};
  const clientName = doc.clientName || p.clientName || request.targetName || 'Cliente';
  const description = doc.description || p.description || '';
  const performedAt = doc.performedAt || p.performedAt;
  const items: any[] = doc.items || p.items || [];
  const waste: any[] = doc.waste || p.waste || [];

  const chargedPrice = parseDecimal(doc.chargedPrice ?? p.chargedPrice);
  const materialsCost = parseDecimal(doc.materialsCost ?? p.materialsCost ?? doc.totalCost ?? p.totalCost);
  const wasteCost = parseDecimal(doc.wasteCost ?? p.wasteCost);
  const profit = parseDecimal(doc.profit ?? p.profit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="h-5 w-5" />
            Revisión y Aprobación de Reversión
          </DialogTitle>
          <DialogDescription>
            Revisa el detalle completo de la obra antes de autorizar la devolución de materiales al inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* General Work Info Card */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                <User className="h-4 w-4 text-primary" />
                <span>Cliente: {clientName}</span>
              </div>
              {performedAt && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Ejecutada el {new Date(performedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {description && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Descripción:</strong> {description}
              </p>
            )}

            {request.requestedBy && (
              <p className="text-muted-foreground text-[11px]">
                Solicitado por: <strong>{request.requestedBy.name || request.requestedBy.email}</strong>
              </p>
            )}
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-4 gap-2.5 p-2.5 bg-muted/30 rounded-lg border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Precio Cobrado</span>
              <span className="text-sm font-bold text-info">${chargedPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Costo Materiales</span>
              <span className="text-sm font-bold text-muted-foreground">${materialsCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Costo Merma</span>
              <span className="text-sm font-bold text-amber-600">${wasteCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Ganancia Neta</span>
              <span className="text-sm font-bold text-success">${profit.toFixed(2)}</span>
            </div>
          </div>

          {/* Consumed Materials Table (To be restored) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Package className="h-4 w-4 text-primary" />
                Materiales a Reincorporar al Inventario ({items.length})
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                El stock se incrementará automáticamente
              </span>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="h-8 text-[11px]">
                    <TableHead>Material / Ítem</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead className="text-right">Stock a Recuperar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-3 text-muted-foreground italic text-xs">
                        No se detallaron materiales en el registro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it: any, idx: number) => {
                      const itemName =
                        it.itemName ||
                        (typeof it.item === 'object' && it.item?.name) ||
                        `Material #${idx + 1}`;
                      const itemDesc = (typeof it.item === 'object' && it.item?.description) || it.description;
                      const rawUnit = it.unitSymbol || (it.item?.pieceSpec?.measureUnit as any)?.symbol || 'm';
                      const unitSymbol = typeof rawUnit === 'object' ? (rawUnit.symbol || 'm') : (rawUnit || 'm');

                      const piecesQty = parseDecimal(it.piecesConsumed || it.quantity);
                      const measureQty = parseDecimal(it.measureUsed);

                      return (
                        <TableRow key={idx} className="h-10 text-xs">
                          <TableCell className="font-medium py-2">
                            <div>
                              <span className="font-semibold text-foreground block truncate">{itemName}</span>
                              {itemDesc && (
                                <span className="text-[10px] text-muted-foreground block truncate">{itemDesc}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            {it.mode === 'pieces' ? (
                              <Badge variant="outline" className="text-[11px]">Piezas enteras</Badge>
                            ) : it.mode === 'measure' ? (
                              <Badge variant="secondary" className="text-[11px]">
                                <Scissors className="h-3 w-3 mr-1" />
                                Corte ({it.source === 'whole_piece' ? 'Pieza nueva' : 'Desde retazo'})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">Directo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2 font-bold text-success text-xs">
                            {it.mode === 'pieces'
                              ? `+${piecesQty} pz`
                              : it.mode === 'measure'
                              ? `+${piecesQty || 1} pz (${measureQty > 0 ? `${measureQty} ` : ''}${unitSymbol})`
                              : `+${piecesQty} unid.`}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Waste / Remnants Generated (If Any) */}
          {waste.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Mermas / Retazos que se Anularán ({waste.length})</span>
              </div>
              <div className="rounded-md border p-2 bg-amber-500/5 space-y-1 text-xs">
                {waste.map((w: any, idx: number) => {
                  const wName = w.itemName || (typeof w.item === 'object' && w.item?.name) || `Retazo #${idx + 1}`;
                  const wMeasure = parseDecimal(w.measure);
                  const wCost = parseDecimal(w.cost);
                  return (
                    <div key={idx} className="flex justify-between items-center py-0.5 text-muted-foreground">
                      <span>{wName} ({wMeasure.toFixed(2)}m)</span>
                      <span className="font-medium text-amber-600">${wCost.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operational Impact Box */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive space-y-1">
            <p className="font-semibold">Consecuencias de esta confirmación:</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
              <li>Los materiales consumidos volverán a sumar al stock disponible en bodega.</li>
              <li>Los retazos originales reutilizados volverán a estado disponible.</li>
              <li>La obra quedará marcada permanentemente como rechazada/cancelada.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Procesando Reversión...' : 'Confirmar y Revertir Obra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
