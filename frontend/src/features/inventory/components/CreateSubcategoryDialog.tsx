import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSubcategory, useCategories, useUnits } from '../hooks/useInventoryData';

export default function CreateSubcategoryDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate: create, isPending } = useCreateSubcategory();
  const { data: categories, isLoading: loadingCat } = useCategories();
  const { data: units, isLoading: loadingUnits } = useUnits();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({ name, category, unit }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Subcategoría</DialogTitle>
          <DialogDescription>Crea un grupo de ítems que compartan la misma unidad de medida y categoría.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría Padre</Label>
            <select 
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={category} 
              onChange={e => setCategory(e.target.value)}
              disabled={loadingCat}
            >
              <option value="">Selecciona categoría...</option>
              {categories?.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Nombre de la Subcategoría</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Tubos Redondos" />
          </div>

          <div className="space-y-2">
            <Label>Unidad de Medida (Kilos, Metros, etc.)</Label>
            <select 
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={unit} 
              onChange={e => setUnit(e.target.value)}
              disabled={loadingUnits}
            >
              <option value="">Selecciona unidad...</option>
              {units?.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Creando...' : 'Crear Subcategoría'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
