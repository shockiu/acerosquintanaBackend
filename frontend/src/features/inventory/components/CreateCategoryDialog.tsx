import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCategory } from '../hooks/useInventoryData';

export default function CreateCategoryDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate: create, isPending } = useCreateCategory();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({ name, description }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Categoría</DialogTitle>
          <DialogDescription>Agrupa las subcategorías de tu catálogo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la Categoría</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Acero Inoxidable" />
          </div>
          
          <div className="space-y-2">
            <Label>Descripción (Opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Materiales resistentes a la corrosión..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Creando...' : 'Crear Categoría'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
