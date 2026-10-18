import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { Edit2, Package, Layers, FolderTree } from 'lucide-react';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function ApproveUpdateDialog({
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

  const getEntityLabel = () => {
    switch (request.entity) {
      case 'inventoryItem':
        return request.action === 'create' ? 'Creación de Ítem' : 'Modificación de Ítem';
      case 'category':
        return 'Modificación de Categoría';
      case 'subcategory':
        return 'Modificación de Subcategoría';
      default:
        return 'Actualización';
    }
  };

  const getEntityIcon = () => {
    switch (request.entity) {
      case 'inventoryItem':
        return <Package className="h-5 w-5 text-brand" />;
      case 'category':
        return <FolderTree className="h-5 w-5 text-brand" />;
      case 'subcategory':
        return <Layers className="h-5 w-5 text-brand" />;
      default:
        return <Edit2 className="h-5 w-5 text-brand" />;
    }
  };

  const p = request.payload || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEntityIcon()}
            {getEntityLabel()}
          </DialogTitle>
          <DialogDescription>
            Revisa los datos solicitados por {request.requestedBy?.name || 'el operario'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {(request.targetName || request.targetDoc?.name || p.name || p.itemName) && (
            <div className="rounded-md bg-muted/60 p-2.5 text-xs flex justify-between items-center border">
              <span className="text-muted-foreground font-medium">Elemento a Modificar:</span>
              <span className="font-semibold text-foreground text-sm">{request.targetName || request.targetDoc?.name || p.name || p.itemName}</span>
            </div>
          )}

          <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
            <span className="font-semibold text-xs text-muted-foreground block border-b pb-1">
              Valores Propuestos:
            </span>

            {request.action === 'create' && p.name && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-semibold text-foreground">{p.name}</span>
              </div>
            )}

            {request.action !== 'create' && p.name && p.name !== (request.targetName || request.targetDoc?.name) && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Nuevo Nombre:</span>
                <span className="font-semibold text-foreground">{p.name}</span>
              </div>
            )}

            {p.description !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Descripción:</span>
                <span className="text-foreground">{p.description || '(Vacía)'}</span>
              </div>
            )}

            {p.kind && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium text-foreground">
                  {p.kind === 'tool' ? 'Herramienta' : 'Material Consumible'}
                </span>
              </div>
            )}

            {p.pieceSpec !== undefined && (
              <div className="text-xs pt-1 border-t space-y-1">
                <span className="text-muted-foreground block">Control Dimensional:</span>
                {p.pieceSpec === null ? (
                  <span className="text-destructive">Desactivar control de retazos</span>
                ) : (
                  <span className="font-medium text-foreground">
                    Pieza de {p.pieceSpec.pieceSize} (Mín. útil: {p.pieceSpec.minUsableMeasure ?? '-'})
                  </span>
                )}
              </div>
            )}

            {p.isActive !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Estado Activo:</span>
                <span className="text-foreground">{p.isActive ? 'Sí' : 'No'}</span>
              </div>
            )}

            {p.stock !== undefined && (
              <div className="flex justify-between text-xs font-semibold text-brand">
                <span className="text-muted-foreground">Nuevo Stock / Existencias:</span>
                <span>{p.stock}</span>
              </div>
            )}

            {p.avgUnitCost !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Costo Unitario ($):</span>
                <span>${Number(p.avgUnitCost).toFixed(2)}</span>
              </div>
            )}

            {p.clearRemnants && (
              <div className="text-xs text-destructive p-1.5 bg-destructive/10 rounded">
                <span>⚠️ Solicita descartar/eliminar retazos asociados</span>
              </div>
            )}

            {p.adjustmentReason && (
              <div className="text-xs pt-1 border-t text-muted-foreground">
                <span className="font-medium text-foreground">Motivo:</span> {p.adjustmentReason}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="brand" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Procesando...' : 'Aprobar y Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
