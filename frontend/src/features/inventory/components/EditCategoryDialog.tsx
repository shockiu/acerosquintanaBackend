import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/AuthContext';
import { useUpdateCategory } from '../hooks/useInventoryData';
import type { Category } from '../schemas/inventory.schema';
import { AlertCircle } from 'lucide-react';

export default function EditCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: update, isPending } = useUpdateCategory();

  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update(
      { id: category._id, data: { name, description } },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Categoría</DialogTitle>
          <DialogDescription>Modifica los datos de la categoría en el catálogo.</DialogDescription>
        </DialogHeader>

        {!isAdmin && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Como usuario operario, esta modificación se enviará a aprobación previa del administrador.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la Categoría</Label>
            <Input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Acero Inoxidable"
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción (Opcional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Materiales resistentes a la corrosión..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={isPending}>
              {isPending ? 'Guardando...' : isAdmin ? 'Guardar Cambios' : 'Solicitar Modificación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
