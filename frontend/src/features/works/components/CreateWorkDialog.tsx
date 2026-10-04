import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateWork } from '../hooks/useWorksData';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

export default function CreateWorkDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: createWork, isPending } = useCreateWork();
  const { data: inventoryItems } = useInventoryItems();

  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().split('T')[0]);
  const [chargedPrice, setChargedPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ item: string; quantity: number }[]>([]);

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { item: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'item' | 'quantity', value: string | number) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.some(i => !i.item || i.quantity <= 0)) {
      alert("Por favor completa correctamente los materiales consumidos.");
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      clientName,
      description,
      performedAt: new Date(performedAt).toISOString(),
      items: selectedItems,
    };

    if (isAdmin && chargedPrice) {
      payload.chargedPrice = Number(chargedPrice);
    }
    
    createWork(payload, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Obra</DialogTitle>
          <DialogDescription>
            Documenta el trabajo realizado y los materiales utilizados. Se enviará a aprobación para deducir el stock real.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Cliente / Empresa</Label>
              <Input required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej. Constructora xyz" />
            </div>
            <div className="space-y-2">
              <Label>Fecha de ejecución</Label>
              <Input type="date" required value={performedAt} onChange={e => setPerformedAt(e.target.value)} />
            </div>
            
            {isAdmin && (
              <div className="space-y-2 col-span-2">
                <Label>Precio Cobrado al Cliente $ (Opcional)</Label>
                <Input type="number" min="0" step="0.01" value={chargedPrice} onChange={e => setChargedPrice(e.target.value)} placeholder="Ej. 1500.00" />
                <p className="text-xs text-muted-foreground">Solo visible para administradores. La obra se aprobará inmediatamente.</p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Descripción del Trabajo</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalla las actividades realizadas..." />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Materiales Consumidos</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" /> Añadir Material
              </Button>
            </div>
            
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No se han registrado materiales para esta obra.</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((line, index) => (
                  <div key={index} className="flex gap-2 items-center bg-muted/50 p-2 rounded-md">
                    <select
                      required
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={line.item}
                      onChange={e => handleItemChange(index, 'item', e.target.value)}
                    >
                      <option value="">Selecciona un material...</option>
                      {inventoryItems?.map(inv => (
                        <option key={inv._id} value={inv._id}>{inv.name} (Stock: {inv.stock})</option>
                      ))}
                    </select>
                    <Input 
                      type="number" 
                      required 
                      min="1" 
                      className="w-24 bg-background" 
                      placeholder="Cant." 
                      value={line.quantity || ''} 
                      onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} 
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Procesando...' : 'Registrar Obra'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
