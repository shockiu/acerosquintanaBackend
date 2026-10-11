import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { useReverseWork } from '../hooks/useWorksData';
import { Scissors, AlertTriangle, Package, RotateCcw } from 'lucide-react';
import type { Work } from '../schemas/works.schema';

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

  const handleReverse = () => {
    const msg = isAdmin
      ? `¿Estás seguro de que deseas revertir la obra "${work.clientName}"?\n\nLos materiales consumidos se reincorporarán al inventario, los retazos originales volverán a estar disponibles y los retazos hijos generados serán invalidados.`
      : `¿Estás seguro de que deseas solicitar la reversión de la obra "${work.clientName}"?\n\nLa solicitud se enviará a la bandeja de aprobaciones para revisión del administrador.`;

    if (confirm(msg)) {
      reverseWork(work._id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

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

        {/* Financial Summary (Admin Only) */}
        {isAdmin && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
            <div>
              <span className="text-muted-foreground block">Precio Cobrado</span>
              <span className="text-base font-bold text-info">${Number(work.chargedPrice || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Costo Materiales</span>
              <span className="text-base font-bold text-muted-foreground">${Number(work.materialsCost || work.totalCost || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Costo de Merma</span>
              <span className="text-base font-bold text-amber-600">${Number(work.wasteCost || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Ganancia Neta</span>
              <span className="text-base font-bold text-success">${Number(work.profit || 0).toFixed(2)}</span>
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
                    const itemName = typeof it.item === 'object' && it.item ? it.item.name : (it.item as string || `Material #${idx + 1}`);

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">{itemName}</TableCell>
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
                            ? `${it.piecesConsumed || it.quantity} pz`
                            : it.mode === 'measure'
                            ? `${it.measureUsed} m`
                            : `${it.quantity}`}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right text-xs font-semibold">
                            ${Number(it.subtotal || 0).toFixed(2)}
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
                    const itemName = typeof ws.item === 'object' && ws.item ? ws.item.name : 'Material';
                    const subcatName = typeof ws.subcategory === 'object' && ws.subcategory ? ws.subcategory.name : '-';
                    const unitSym = typeof ws.measureUnit === 'object' && ws.measureUnit ? ws.measureUnit.symbol : 'm';

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">{itemName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{subcatName}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          {Number(ws.measure).toFixed(2)} {unitSym}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ws.manual ? 'Manual (dañado)' : 'Automática (corte menor al mín.)'}
                          {ws.note ? ` - ${ws.note}` : ''}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right text-xs font-semibold text-amber-600">
                            ${Number(ws.cost || 0).toFixed(2)}
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
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isReversing}
                onClick={handleReverse}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                {isReversing ? 'Revirtiendo...' : isAdmin ? 'Revertir Obra' : 'Solicitar Reversión'}
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
