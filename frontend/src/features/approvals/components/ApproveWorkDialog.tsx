import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApproveRequest } from '../hooks/useApprovalsData';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function ApproveWorkDialog({ open, onOpenChange, request }: { open: boolean, onOpenChange: (open: boolean) => void, request: ChangeRequest }) {
  const { mutate: approve, isPending } = useApproveRequest();
  const [chargedPrice, setChargedPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approve({ id: request._id, overrides: { chargedPrice: Number(chargedPrice) } }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  const payload = request.payload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar Obra / Trabajo</DialogTitle>
          <DialogDescription>
            Obra para el cliente <strong>{payload.clientName}</strong>. 
            Se reportó consumo de materiales. Asigna el monto que se le cobró al cliente para calcular las ganancias.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Precio Cobrado al Cliente $</Label>
            <Input 
              type="number" 
              required 
              min="0"
              step="0.01"
              value={chargedPrice} 
              onChange={e => setChargedPrice(e.target.value)} 
              placeholder="Ej. 1200.00" 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={isPending}>{isPending ? 'Procesando...' : 'Aprobar Obra'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
