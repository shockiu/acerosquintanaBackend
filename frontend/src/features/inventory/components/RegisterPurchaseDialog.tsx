import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegisterPurchase } from '../hooks/useInventoryData';
import type { InventoryItem } from '../schemas/inventory.schema';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/AuthContext';

export default function RegisterPurchaseDialog({ open, onOpenChange, item }: { open: boolean, onOpenChange: (open: boolean) => void, item: InventoryItem }) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: purchase, isPending } = useRegisterPurchase();
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [totalCost, setTotalCost] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { quantity: Number(quantity), note };
    if (isAdmin && totalCost) {
      payload.totalCost = Number(totalCost);
    }
    
    purchase({ itemId: item._id, data: payload }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Llegada de Material</DialogTitle>
          <DialogDescription>
            Registra el ingreso de <strong>{item.name}</strong> al almacén. Esto se enviará a aprobación.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cantidad a ingresar</Label>
            <Input 
              type="number" 
              required 
              min="1"
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              placeholder="Ej. 100" 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Nota u Observación (Opcional)</Label>
            <Textarea 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Ej. Entregado por el proveedor X con guía Y" 
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label>Costo Total de la Compra (Monto Factura) $</Label>
              <Input 
                type="number" 
                required 
                min="0"
                step="0.01"
                value={totalCost} 
                onChange={e => setTotalCost(e.target.value)} 
                placeholder="Ej. 5000.00" 
              />
              <p className="text-xs text-muted-foreground">Requerido porque como Administrador, el registro se aprueba inmediatamente.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Procesando...' : 'Registrar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
