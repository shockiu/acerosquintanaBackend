import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useItemRemnants, useDiscardRemnant } from '../hooks/useInventoryData';
import { useAuth } from '@/features/auth/AuthContext';
import { Trash2, Scissors } from 'lucide-react';
import type { InventoryItem } from '../schemas/inventory.schema';

export default function ViewRemnantsDialog({
  item,
  open,
  onOpenChange,
}: {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const [filterStatus, setFilterStatus] = useState<string>('available');

  const { data: remnants, isLoading } = useItemRemnants(item._id, filterStatus === 'all' ? undefined : filterStatus);
  const { mutate: discard, isPending: isDiscarding } = useDiscardRemnant();

  const unitSymbol = (item.pieceSpec?.measureUnit as any)?.symbol || 'm';

  const handleDiscard = (remnantId: string) => {
    if (confirm('¿Estás seguro de que deseas descartar este retazo como merma?')) {
      discard({ remnantId, note: 'Descarte manual desde panel de inventario' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Retazos y Sobrantes de: {item.name}
          </DialogTitle>
          <DialogDescription>
            Listado de cortes remanentes disponibles o utilizados para este material.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 items-center py-2">
          <Button
            size="sm"
            variant={filterStatus === 'available' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('available')}
            className="text-xs"
          >
            Disponibles
          </Button>
          <Button
            size="sm"
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            className="text-xs"
          >
            Todos los estados
          </Button>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Obra de Origen</TableHead>
                {isAdmin && <TableHead className="text-right">Costo / Medida</TableHead>}
                {isAdmin && <TableHead className="text-right">Valor Retazo</TableHead>}
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-6 text-muted-foreground">
                    Cargando retazos...
                  </TableCell>
                </TableRow>
              ) : !remnants || remnants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-6 text-muted-foreground italic">
                    No hay retazos registrados con este filtro.
                  </TableCell>
                </TableRow>
              ) : (
                remnants.map((r) => {
                  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
                    available: { label: 'Disponible', variant: 'default' },
                    used: { label: 'Utilizado', variant: 'secondary' },
                    discarded: { label: 'Descartado (Merma)', variant: 'destructive' },
                  };
                  const currentStatus = statusMap[r.status] || { label: r.status, variant: 'secondary' };

                  return (
                    <TableRow key={r._id}>
                      <TableCell className="font-semibold">
                        {Number(r.measure).toFixed(2)} {unitSymbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(r.originWork as any)?.clientName || 'General'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right text-xs text-muted-foreground">
                          ${Number(r.costPerMeasureSnapshot || 0).toFixed(2)}
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell className="text-right font-medium">
                          ${(Number(r.measure) * Number(r.costPerMeasureSnapshot || 0)).toFixed(2)}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {r.status === 'available' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-7 px-2 text-xs"
                            onClick={() => handleDiscard(r._id)}
                            disabled={isDiscarding}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Descartar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
