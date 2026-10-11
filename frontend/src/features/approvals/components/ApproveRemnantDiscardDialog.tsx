import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { Trash2 } from 'lucide-react';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function ApproveRemnantDiscardDialog({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Trash2 className="h-5 w-5" />
            Aprobar Descarte de Retazo
          </DialogTitle>
          <DialogDescription>
            El operario solicitó descartar un retazo como merma (ID: {request.targetId}).
          </DialogDescription>
        </DialogHeader>

        {request.payload?.note && (
          <div className="p-3 bg-muted/40 rounded-md border text-xs">
            <span className="font-semibold text-muted-foreground block mb-0.5">Nota del operario:</span>
            <p className="italic text-foreground">{request.payload.note}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Al confirmar, el retazo pasará a estado <strong>descartado</strong> y su costo se registrará como pérdida/merma en el inventario.
        </p>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="brand" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Procesando...' : 'Aprobar Descarte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
