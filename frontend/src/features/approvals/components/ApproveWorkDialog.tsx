import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import { 
  Package, 
  Scissors, 
  Wrench, 
  User, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock
} from 'lucide-react';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function ApproveWorkDialog({ 
  open, 
  onOpenChange, 
  request 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  request: ChangeRequest;
}) {
  const { mutate: approve, isPending } = useApproveRequest();
  const payload = request.payload || {};
  const [chargedPrice, setChargedPrice] = useState(
    payload.chargedPrice != null && payload.chargedPrice !== '' 
      ? String(payload.chargedPrice) 
      : ''
  );
  const { data: inventoryData } = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : ((inventoryData as any)?.items ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approve({ id: request._id, overrides: { chargedPrice: Number(chargedPrice) } }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  const clientName = payload.clientName || request.targetName || 'Cliente no especificado';
  const description = payload.description || '';
  const performedAt = payload.performedAt;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const waste = Array.isArray(payload.waste) ? payload.waste : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Aprobar Obra y Consumo de Inventario</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Revisa los materiales y herramientas declarados antes de autorizar la salida de stock y fijar el precio cobrado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Metadata Grid Card */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Cliente / Proyecto</span>
                  <span className="font-bold text-foreground text-sm">{clientName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Fecha de Ejecución</span>
                  <span className="font-semibold text-foreground">
                    {performedAt ? new Date(performedAt).toLocaleDateString('es-ES', { dateStyle: 'long' }) : 'No especificada'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Solicitado por</span>
                  <span className="font-semibold text-foreground">
                    {request.requestedBy?.name || request.requestedBy?.email || 'Operario'}
                  </span>
                </div>
              </div>
            </div>

            {description && (
              <div className="flex items-start gap-2 pt-2 border-t text-muted-foreground">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground font-medium">Descripción del trabajo: </strong>
                  <span>{description}</span>
                </div>
              </div>
            )}
          </div>

          {/* Consumed Materials & Tools Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Materiales e Ítems a Consumir / Utilizar ({items.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Las cantidades se validan contra el stock actual en almacén
              </span>
            </div>

            <div className="rounded-lg border overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 h-9 text-[11px]">
                    <TableHead className="font-semibold">Ítem / Material</TableHead>
                    <TableHead className="font-semibold">Modalidad</TableHead>
                    <TableHead className="font-semibold">Consumo / Declaración</TableHead>
                    <TableHead className="text-right font-semibold">Stock Actual</TableHead>
                    <TableHead className="text-right font-semibold">Stock Resultante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground italic text-xs">
                        No se registraron ítems en esta obra.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it: any, idx: number) => {
                      const inv = typeof it.item === 'object' && it.item
                        ? it.item
                        : inventoryItems.find((i: any) => i._id === it.item);

                      const name = it.itemName || inv?.name || `Material #${idx + 1}`;
                      const unitSymbol = it.unitSymbol || (inv?.pieceSpec?.measureUnit as any)?.symbol || 'm';
                      const isTool = it.mode === 'tool' || inv?.kind === 'tool';
                      const currentStock = Number(inv?.stock ?? 0);
                      const unitLabel = inv?.pieceSpec ? 'pz' : 'unid.';

                      // Calculate exact deducted quantity from main inventory stock
                      let deductedQty = 0;
                      if (isTool) {
                        deductedQty = it.lostQuantity ? Number(it.lostQuantity) : 0;
                      } else if (it.mode === 'pieces') {
                        deductedQty = Number(it.quantity || it.piecesConsumed || 1);
                      } else if (it.mode === 'measure') {
                        if (it.source === 'whole_piece') {
                          const pieceSize = Number(inv?.pieceSpec?.pieceSize || 0);
                          const measureUsed = Number(it.measureUsed || 0);
                          deductedQty = pieceSize > 0 ? Math.ceil(measureUsed / pieceSize) : 1;
                        } else {
                          // uses existing remnant, does not deduct whole pieces from main stock
                          deductedQty = 0;
                        }
                      } else if (it.mode === 'waste') {
                        deductedQty = 0;
                      } else {
                        deductedQty = Number(it.quantity || 1);
                      }

                      const projectedStock = currentStock - deductedQty;
                      const isDeficit = projectedStock < 0;
                      const hasLowStock = isTool ? currentStock < Number(it.quantity || 1) : currentStock < deductedQty;

                      return (
                        <TableRow key={idx} className="h-11 text-xs hover:bg-muted/20">
                          {/* Item Column */}
                          <TableCell className="py-2.5 font-medium max-w-[260px]">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground">{name}</span>
                                {isTool && (
                                  <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                    <Wrench className="h-2.5 w-2.5 mr-1" />
                                    Herramienta
                                  </Badge>
                                )}
                              </div>
                              {inv?.description && (
                                <span className="text-[11px] text-muted-foreground block line-clamp-1">{inv.description}</span>
                              )}
                              {inv?.pieceSpec && (
                                <span className="text-[10px] text-muted-foreground block">
                                  Pieza estándar: {inv.pieceSpec.pieceSize} {unitSymbol}
                                </span>
                              )}
                              {isTool && it.note && (
                                <span className="text-[10px] text-muted-foreground italic block">
                                  Nota: {it.note}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Mode Column */}
                          <TableCell className="py-2.5">
                            {isTool ? (
                              it.lostQuantity && it.lostQuantity > 0 ? (
                                <Badge variant="destructive" className="text-[11px] font-medium">
                                  Baja ({it.lostQuantity} unid.)
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[11px] font-medium">
                                  Reutilizada en taller
                                </Badge>
                              )
                            ) : it.mode === 'pieces' ? (
                              <Badge variant="outline" className="text-[11px]">
                                Piezas enteras
                              </Badge>
                            ) : it.mode === 'measure' ? (
                              <Badge variant="secondary" className="text-[11px]">
                                <Scissors className="h-3 w-3 mr-1" />
                                Corte ({it.source === 'whole_piece' ? 'Pieza nueva' : 'Desde retazo'})
                              </Badge>
                            ) : it.mode === 'waste' ? (
                              <Badge variant="destructive" className="text-[11px]">
                                Descarte de retazo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">
                                Consumo directo
                              </Badge>
                            )}
                          </TableCell>

                          {/* Consumption Details */}
                          <TableCell className="py-2.5">
                            {isTool ? (
                              <div>
                                <span className="font-semibold text-foreground">
                                  {it.quantity} en uso
                                </span>
                                {it.lostQuantity && it.lostQuantity > 0 ? (
                                  <span className="text-destructive block text-[11px] font-medium mt-0.5">
                                    ⚠️ {it.lostQuantity} dada(s) de baja ({it.lossReason === 'end_of_life' ? 'vida útil' : it.lossReason === 'damaged' ? 'daño en obra' : 'pérdida'})
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground block text-[11px] mt-0.5">
                                    Retorna íntegra al taller (no reduce stock)
                                  </span>
                                )}
                              </div>
                            ) : it.mode === 'pieces' ? (
                              <div>
                                <span className="font-semibold text-primary">{it.quantity} pz. enteras</span>
                                <span className="text-[11px] text-muted-foreground block">
                                  Deduce {it.quantity} unidades del stock
                                </span>
                              </div>
                            ) : it.mode === 'measure' ? (
                              <div>
                                <span className="font-semibold text-primary">
                                  {it.measureUsed} {unitSymbol}
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                  {it.source === 'whole_piece' ? 'Generará retazo o merma residual' : 'Consumido desde retazo existente'}
                                </span>
                              </div>
                            ) : it.mode === 'waste' ? (
                              <span className="text-amber-600 font-medium">Registro de merma</span>
                            ) : (
                              <span className="font-semibold text-primary">{it.quantity} unid.</span>
                            )}
                          </TableCell>

                          {/* Current Stock */}
                          <TableCell className="py-2.5 text-right font-medium">
                            {inv ? (
                              <div>
                                <span className={`font-bold ${hasLowStock ? 'text-destructive' : 'text-foreground'}`}>
                                  {currentStock} {unitLabel}
                                </span>
                                {hasLowStock && (
                                  <span className="text-[10px] text-destructive block font-medium">
                                    Insuficiente
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* Projected Stock Result */}
                          <TableCell className="py-2.5 text-right font-medium">
                            {inv ? (
                              <div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className={`font-bold ${isDeficit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {projectedStock} {unitLabel}
                                  </span>
                                  {deductedQty > 0 ? (
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-medium">
                                      -{deductedQty}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                      (=)
                                    </span>
                                  )}
                                </div>
                                {isDeficit ? (
                                  <span className="text-[10px] text-destructive block font-medium">
                                    Déficit: {Math.abs(projectedStock)} {unitLabel}
                                  </span>
                                ) : isTool && deductedQty === 0 ? (
                                  <span className="text-[10px] text-muted-foreground block">
                                    Reutilizada
                                  </span>
                                ) : it.mode === 'measure' && it.source === 'remnant' ? (
                                  <span className="text-[10px] text-muted-foreground block">
                                    Usa retazo
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Waste / Retazos Generated (If Any) */}
          {waste.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Mermas / Retazos Declarados ({waste.length})</span>
              </div>
              <div className="rounded-lg border p-2.5 bg-amber-500/5 space-y-1 text-xs">
                {waste.map((w: any, idx: number) => {
                  const wName = w.itemName || (typeof w.item === 'object' && w.item?.name) || `Retazo #${idx + 1}`;
                  return (
                    <div key={idx} className="flex justify-between items-center py-0.5 text-muted-foreground">
                      <span>{wName} ({w.measure}m)</span>
                      <span className="text-[11px] font-medium text-amber-600">{w.note || 'Merma'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing & Confirmation Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t">
            <div className="p-3 bg-muted/40 rounded-xl border space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="chargedPrice" className="text-xs font-bold text-foreground">
                  Precio Cobrado al Cliente $ (Monto Total de Venta)
                </Label>
                <span className="text-[11px] text-muted-foreground">Requerido para cálculo de ganancia</span>
              </div>
              <Input 
                id="chargedPrice"
                type="number" 
                required 
                min="0"
                step="0.01"
                value={chargedPrice} 
                onChange={e => setChargedPrice(e.target.value)} 
                placeholder="Ej. 1200.00" 
                className="bg-background text-sm font-semibold"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                Al aprobar, se descontarán los materiales y bajas de herramientas del inventario, se calcularán los costos y ganancias, y la obra quedará registrada como aprobada.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" variant="brand" disabled={isPending} className="font-semibold">
                {isPending ? 'Procesando Aprobación...' : 'Aprobar Obra Definitivamente'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
