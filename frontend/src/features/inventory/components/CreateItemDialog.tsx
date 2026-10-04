import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateItem, useSubcategories } from '../hooks/useInventoryData';

export default function CreateItemDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate: create, isPending } = useCreateItem();
  const { data: subcategories, isLoading } = useSubcategories();

  const [name, setName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [kind, setKind] = useState<'material'|'tool'>('material');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({ name, subcategory, kind }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Ítem de Inventario</DialogTitle>
          <DialogDescription>Añade un nuevo material o herramienta al catálogo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Tubo redondo 2 pulgadas" />
          </div>
          
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={kind} 
              onChange={e => setKind(e.target.value as 'material'|'tool')}
            >
              <option value="material">Material Consumible</option>
              <option value="tool">Herramienta de Trabajo</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Subcategoría</Label>
            <select 
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={subcategory} 
              onChange={e => setSubcategory(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Selecciona subcategoría...</option>
              {subcategories?.map(sub => (
                <option key={sub._id} value={sub._id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Creando...' : 'Crear Ítem'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
