import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/features/auth/AuthContext';
import { useReverseWork } from '../hooks/useWorksData';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import { Scissors, AlertTriangle, Package, RotateCcw, Clock } from 'lucide-react';
import type { Work } from '../schemas/works.schema';

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

export default function ViewWorkDetailsDialog({
  work,
  open,
  onOpenChange,
}: {
  work: Work;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: reverseWork, isPending: isReversing } = useReverseWork();
  const [showConfirmReverse, setShowConfirmReverse] = useState(false);

  const { data: inventoryData } = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : ((inventoryData as any)?.items ?? []);

  const chargedPrice = parseDecimal(work.chargedPrice);
  const materialsCost = parseDecimal(work.materialsCost || work.totalCost);
  const wasteCost = parseDecimal(work.wasteCost);
  const profit = parseDecimal(work.profit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Detalle de Obra: {work.clientName}</DialogTitle>
            <StatusBadge status={work.status} />
          </div>
          <DialogDescription>
            Ejecutada el {new Date(work.performedAt).toLocaleDateString()}. {work.description || ''}
          </DialogDescription>
        </DialogHeader>

        {work.hasPendingReversal && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Esta obra ya tiene una <strong>solicitud de reversión en espera</strong> de revisión y aprobación por el administrador.</span>
          </div>
        )}

        {/* Financial Summary (Admin Only) */}
        {isAdmin && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
            <div>
              <span className="text-muted-foreground block">Precio Cobrado</span>
              <span className="text-base font-bold text-info">${chargedPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Costo Materiales</span>
              <span className="text-base font-bold text-muted-foreground">${materialsCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Costo de Merma</span>
              <span className="text-base font-bold text-amber-600">${wasteCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Ganancia Neta</span>
              <span className="text-base font-bold text-success">${profit.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Consumed Materials Table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Package className="h-4 w-4 text-primary" />
            <span>Materiales y Herramientas Utilizados</span>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material / Ítem</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead className="text-right">Consumo</TableHead>
                  {isAdmin && <TableHead className="text-right">Subtotal $</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!work.items || work.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-4 text-muted-foreground italic text-xs">
                      No se registraron materiales.
                    </TableCell>
                  </TableRow>
                ) : (
                  work.items.map((it, idx) => {
                    const invDoc = typeof it.item === 'object' && it.item
                      ? it.item
                      : inventoryItems.find((inv: any) => inv._id === it.item);

                    const itemName = invDoc?.name || `Material #${idx + 1}`;
                    const itemDescription = invDoc?.description;
                    const itemSubcategory = typeof invDoc?.subcategory === 'object' && invDoc.subcategory
                      ? invDoc.subcategory.name
                      : undefined;
                    const unitSymbol = (invDoc?.pieceSpec?.measureUnit as any)?.symbol || 'm';

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">
                          <div>
                            <span className="font-semibold text-foreground block">{itemName}</span>
                            {itemDescription && (
                              <span className="text-[11px] text-muted-foreground block">{itemDescription}</span>
                            )}
                            {itemSubcategory && (
                              <span className="text-[10px] text-brand/80 font-medium block">
                                {itemSubcategory}
                              </span>
                            )}
                            {invDoc?.pieceSpec && (
                              <span className="text-[10px] text-muted-foreground block">
                                Pieza estándar: {invDoc.pieceSpec.pieceSize} {unitSymbol}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {it.mode === 'pieces' ? (
                            <Badge variant="outline" className="text-xs">Piezas enteras</Badge>
                          ) : it.mode === 'measure' ? (
                            <Badge variant="secondary" className="text-xs">
                              <Scissors className="h-3 w-3 mr-1" />
                              Corte ({it.source === 'whole_piece' ? 'Pieza nueva' : 'Desde retazo'})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Unidad directa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {it.mode === 'pieces'
                            ? `${parseDecimal(it.piecesConsumed || it.quantity)} pz`
                            : it.mode === 'measure'
                            ? `${parseDecimal(it.measureUsed)} ${unitSymbol}`
                            : `${parseDecimal(it.quantity)} unid.`}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right text-xs font-semibold">
                            ${parseDecimal(it.subtotal).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Generated Waste (Merma) Section */}
        {work.waste && work.waste.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Merma Generada en esta Obra</span>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Subcategoría</TableHead>
                    <TableHead>Medida</TableHead>
                    <TableHead>Tipo / Nota</TableHead>
                    {isAdmin && <TableHead className="text-right">Costo Merma</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {work.waste.map((ws, idx) => {
                    const wsDoc = typeof ws.item === 'object' && ws.item
                      ? ws.item
                      : inventoryItems.find((inv: any) => inv._id === ws.item);
                    const itemName = wsDoc?.name || (typeof ws.item === 'object' && ws.item ? ws.item.name : 'Material');
                    const subcatName = typeof ws.subcategory === 'object' && ws.subcategory ? ws.subcategory.name : '-';
                    const unitSym = typeof ws.measureUnit === 'object' && ws.measureUnit ? ws.measureUnit.symbol : 'm';

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">
                          <div>
                            <span className="font-semibold text-foreground block">{itemName}</span>
                            {wsDoc?.description && (
                              <span className="text-[11px] text-muted-foreground block">{wsDoc.description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{subcatName}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          {parseDecimal(ws.measure).toFixed(2)} {unitSym}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ws.manual ? 'Manual (dañado)' : 'Automática (corte menor al mín.)'}
                          {ws.note ? ` - ${ws.note}` : ''}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right text-xs font-semibold text-amber-600">
                            ${parseDecimal(ws.cost).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 flex justify-between items-center sm:justify-between">
          <div>
            {work.status === 'approved' && (
              work.hasPendingReversal && !isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-amber-500/40 text-amber-600 bg-amber-500/10 gap-1.5 cursor-not-allowed"
                >
                  <Clock className="h-4 w-4 text-amber-600" />
                  Reversión Solicitada (En Cola)
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isReversing}
                  onClick={() => setShowConfirmReverse(true)}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isReversing ? 'Revirtiendo...' : isAdmin ? 'Revertir Obra' : 'Solicitar Reversión'}
                </Button>
              )
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={showConfirmReverse}
        onOpenChange={setShowConfirmReverse}
        title={isAdmin ? 'Confirmar Reversión de Obra' : 'Solicitar Reversión de Obra'}
        description={
          isAdmin
            ? `¿Estás seguro de que deseas revertir la obra "${work.clientName}"? Los materiales consumidos se reincorporarán al inventario, los retazos originales volverán a estar disponibles y los retazos hijos generados serán invalidados.`
            : `¿Estás seguro de que deseas solicitar la reversión de la obra "${work.clientName}"? La solicitud se enviará a la bandeja de aprobaciones para revisión del administrador.`
        }
        confirmLabel={isAdmin ? 'Revertir Obra' : 'Solicitar Reversión'}
        destructive={true}
        isPending={isReversing}
        onConfirm={() => {
          reverseWork(work._id, {
            onSuccess: () => {
              setShowConfirmReverse(false);
              onOpenChange(false);
            },
          });
        }}
      />
    </Dialog>
  );
}
