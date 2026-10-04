import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRejectRequest } from '../hooks/useApprovalsData';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function RejectDialog({ open, onOpenChange, request }: { open: boolean, onOpenChange: (open: boolean) => void, request: ChangeRequest }) {
  const { mutate: reject, isPending } = useRejectRequest();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reject({ id: request._id, reason }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar Petición</DialogTitle>
          <DialogDescription>
            Indica el motivo por el cual estás rechazando esta operación. El operario podrá ver este motivo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo del rechazo</Label>
            <Textarea 
              required 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="Ej. Falta factura, cantidad incorrecta..." 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={isPending || !reason.trim()}>{isPending ? 'Rechazando...' : 'Rechazar definitivamente'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
