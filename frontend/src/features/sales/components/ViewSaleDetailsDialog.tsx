import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCancelSale } from '../hooks/useSalesData';
import { useAuth } from '@/features/auth/AuthContext';
import { 
  Receipt, 
  User, 
  Calendar, 
  Clock, 
  Package, 
  Wrench, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import type { Sale } from '../schemas/sales.schema';

export default function ViewSaleDetailsDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';

  const { mutate: cancelSale, isPending: isCancelling } = useCancelSale();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isCancelled = sale.status === 'cancelled';

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) return;
    cancelSale(
      { id: sale._id, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setShowConfirmCancel(false);
          setCancelReason('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Venta Directa: {sale.folio || 'Sin Folio'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Ejecutada el {new Date(sale.performedAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}
                  </DialogDescription>
                </div>
              </div>

              {isCancelled ? (
                <Badge variant="destructive" className="text-xs gap-1 py-1">
                  <XCircle className="h-3.5 w-3.5" /> Anulada
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completada
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Cancellation Notice if cancelled */}
            {isCancelled && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Esta venta fue anulada y su stock fue reintegrado al inventario.</span>
                </div>
                {sale.cancellationReason && (
                  <p className="text-[11px] text-destructive/90">
                    <strong>Motivo:</strong> {sale.cancellationReason}
                  </p>
                )}
                {sale.cancelledBy && (
                  <p className="text-[10px] text-muted-foreground">
                    Anulada por:{' '}
                    {typeof sale.cancelledBy === 'object' && sale.cancelledBy
                      ? (sale.cancelledBy.name || sale.cancelledBy.email)
                      : 'Administrador'}
                    {sale.cancelledAt && ` el ${new Date(sale.cancelledAt).toLocaleString()}`}
                  </p>
                )}
              </div>
            )}

            {/* Buyer & Metadata Grid Card */}
            <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Cliente / Comprador</span>
                    <span className="font-bold text-foreground text-sm">{sale.buyerName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Fecha de Venta</span>
                    <span className="font-semibold text-foreground">
                      {new Date(sale.performedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Registrado por</span>
                    <span className="font-semibold text-foreground">
                      {typeof sale.registeredBy === 'object' && sale.registeredBy
                        ? (sale.registeredBy.name || sale.registeredBy.email)
                        : 'Administrador'}
                    </span>
                  </div>
                </div>
              </div>

              {sale.notes && (
                <div className="flex items-start gap-2 pt-2 border-t text-muted-foreground">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground font-medium">Observaciones: </strong>
                    <span>{sale.notes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary Grid (Admin Only) */}
            {isAdmin && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-xl border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Facturado (Venta)</span>
                  <span className="text-base font-bold text-primary">${Number(sale.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Costo de Adquisición</span>
                  <span className="text-base font-bold text-muted-foreground">${Number(sale.totalCost || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Ganancia Neta</span>
                  <span className={`text-base font-bold ${Number(sale.profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    ${Number(sale.profit || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Margen de Rentabilidad</span>
                  <span className="text-base font-bold text-foreground">
                    {sale.profitMargin != null ? Number(sale.profitMargin).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            )}

            {/* Sold Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Detalle de Mercancía Vendida ({sale.items.length})
              </span>

              <div className="rounded-lg border overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 h-9 text-[11px]">
                      <TableHead className="font-semibold">Ítem / Elemento</TableHead>
                      <TableHead className="text-right font-semibold">Cantidad</TableHead>
                      {isAdmin && (
                        <>
                          <TableHead className="text-right font-semibold">Costo Compra Unit.</TableHead>
                          <TableHead className="text-right font-semibold">Precio Venta Unit.</TableHead>
                          <TableHead className="text-right font-semibold">Subtotal Costo</TableHead>
                          <TableHead className="text-right font-semibold">Total Venta</TableHead>
                          <TableHead className="text-right font-semibold">Ganancia</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map((it, idx) => {
                      const isTool = it.kind === 'tool';
                      const profit = Number(it.profit || 0);

                      return (
                        <TableRow key={idx} className="h-10 text-xs">
                          <TableCell className="py-2.5 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{it.name}</span>
                              {isTool ? (
                                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                  <Wrench className="h-2.5 w-2.5 mr-1" />
                                  Herramienta
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5">
                                  Material
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2.5 font-semibold">
                            {Number(it.quantity)} {it.unitSymbol || 'unid.'}
                          </TableCell>
                          {isAdmin && (
                            <>
                              <TableCell className="text-right py-2.5 text-muted-foreground font-mono">
                                ${Number(it.unitCostSnapshot || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right py-2.5 font-semibold text-foreground font-mono">
                                ${Number(it.unitPrice || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right py-2.5 text-muted-foreground font-mono">
                                ${Number(it.subtotalCost || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right py-2.5 font-bold text-primary font-mono">
                                ${Number(it.subtotalPrice || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className={`text-right py-2.5 font-bold font-mono ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t">
            {!isCancelled ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirmCancel(true)}
                disabled={isCancelling}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" /> {isAdmin ? 'Anular Venta' : 'Solicitar Anulación'}
              </Button>
            ) : <div />}

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Cancellation */}
      {showConfirmCancel && (
        <Dialog open={showConfirmCancel} onOpenChange={setShowConfirmCancel}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> {isAdmin ? 'Anular Venta' : 'Solicitar Anulación de Venta'} {sale.folio || ''}
              </DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? 'Esta acción reincorporará automáticamente todos los materiales y herramientas vendidos de vuelta al stock activo del taller.'
                  : 'Como usuario operario, esta solicitud se enviará a aprobación previa del administrador para verificar la reversión del inventario.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <label className="text-xs font-semibold block">
                Motivo de la anulación *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ej. El cliente devolvió los productos, error de facturación..."
                className="w-full text-xs p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowConfirmCancel(false)} disabled={isCancelling}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isCancelling || !cancelReason.trim()}
                onClick={handleConfirmCancel}
              >
                {isCancelling ? 'Enviando...' : isAdmin ? 'Confirmar Anulación y Revertir Stock' : 'Enviar Solicitud de Anulación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
