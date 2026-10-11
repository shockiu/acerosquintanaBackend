import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { RotateCcw } from 'lucide-react';
import type { ChangeRequest } from '../schemas/approvals.schema';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="h-5 w-5" />
            Aprobar Reversión de Obra
          </DialogTitle>
          <DialogDescription>
            El operario solicitó revertir una obra previamente aprobada (ID: {request.targetId}).
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive space-y-1">
          <p className="font-semibold">Efectos de esta aprobación:</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            <li>Los materiales consumidos volverán a reincorporarse al stock.</li>
            <li>Los retazos originales utilizados regresarán a estado disponible.</li>
            <li>Los retazos hijos creados en esta obra serán descartados.</li>
          </ul>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Procesando...' : 'Confirmar Reversión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
