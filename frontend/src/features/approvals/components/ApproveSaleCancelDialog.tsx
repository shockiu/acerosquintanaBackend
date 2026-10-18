import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApproveRequest } from '../hooks/useApprovalsData';
import type { ChangeRequest } from '../schemas/approvals.schema';
import { AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function ApproveSaleCancelDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ChangeRequest;
}) {
  const { mutate: approve, isPending } = useApproveRequest();
  const payload = request.payload || {};
  const targetName = request.targetName || 'Venta';

  const handleApprove = () => {
    approve(
      { id: request._id },
      {
        onSuccess: () => {
          toast.success('Anulación de venta aprobada y stock restituido al taller');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Aprobar Anulación de Venta</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {targetName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-xl border bg-muted/40 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Operación:</span>
              <span className="font-semibold text-foreground">{targetName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Operario Solicitante:</span>
              <span className="font-medium text-foreground">
                {request.requestedBy?.name || request.requestedBy?.email || 'Operario'}
              </span>
            </div>
            {payload.reason && (
              <div className="pt-2 border-t text-[11px]">
                <strong className="text-destructive font-medium block">Motivo de Anulación:</strong>
                <p className="text-foreground mt-0.5 bg-background/80 p-2 rounded border">{payload.reason}</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Al aprobar, los ítems de esta venta se reintegrarán automáticamente al stock disponible.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleApprove}
            className="font-semibold gap-1.5"
          >
            <XCircle className="h-4 w-4" />
            {isPending ? 'Procesando...' : 'Confirmar Anulación y Revertir Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
