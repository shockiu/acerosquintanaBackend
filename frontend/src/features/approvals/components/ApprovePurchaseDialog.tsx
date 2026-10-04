import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApproveRequest } from '../hooks/useApprovalsData';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function ApprovePurchaseDialog({ open, onOpenChange, request }: { open: boolean, onOpenChange: (open: boolean) => void, request: ChangeRequest }) {
  const { mutate: approve, isPending } = useApproveRequest();
  const [totalCost, setTotalCost] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approve({ id: request._id, overrides: { totalCost: Number(totalCost) } }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  const payload = request.payload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar Compra de Material</DialogTitle>
          <DialogDescription>
            El operario registró la entrada de <strong>{payload.quantity} unidades</strong>.
            Por favor, asigna el costo total (factura) de esta compra para calcular el Costo Promedio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Costo Total (Monto Factura) $</Label>
            <Input 
              type="number" 
              required 
              min="0"
              step="0.01"
              value={totalCost} 
              onChange={e => setTotalCost(e.target.value)} 
              placeholder="Ej. 5000.00" 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={isPending}>{isPending ? 'Procesando...' : 'Aprobar Compra'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
