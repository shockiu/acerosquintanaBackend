import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/AuthContext';
import { useUpdateSubcategory, useCategories, useUnits } from '../hooks/useInventoryData';
import type { Subcategory } from '../schemas/inventory.schema';
import { AlertCircle } from 'lucide-react';

export default function EditSubcategoryDialog({
  open,
  onOpenChange,
  subcategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcategory: Subcategory;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: update, isPending } = useUpdateSubcategory();
  const { data: categories, isLoading: loadingCat } = useCategories();
  const { data: units, isLoading: loadingUnits } = useUnits();

  const initialCatId = typeof subcategory.category === 'object' && subcategory.category ? subcategory.category._id : (subcategory.category as string || '');
  const initialUnitId = typeof subcategory.unit === 'object' && subcategory.unit ? subcategory.unit._id : (subcategory.unit as string || '');

  const [name, setName] = useState(subcategory.name);
  const [category, setCategory] = useState(initialCatId);
  const [unit, setUnit] = useState(initialUnitId);
  const [kind, setKind] = useState<'material' | 'tool'>(subcategory.kind || 'material');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update(
      {
        id: subcategory._id,
        data: { name, category, unit, kind },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Subcategoría</DialogTitle>
          <DialogDescription>Modifica los datos del grupo de catálogo.</DialogDescription>
        </DialogHeader>

        {!isAdmin && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Como usuario operario, esta modificación se enviará a aprobación previa del administrador.</span>
          </div>
        )}

        {subcategory.imageUrl && (
          <div className="flex items-center gap-3 p-3 bg-muted/40 border rounded-lg">
            <img
              src={subcategory.imageUrl}
              alt={subcategory.name}
              className="w-14 h-14 rounded-md object-cover border bg-background shrink-0"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground block">Imagen de Catálogo Asociada</span>
              <span className="text-muted-foreground">Esta imagen identifica a la subcategoría en el catálogo e inventario.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Elementos</Label>
            <select
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={kind}
              onChange={e => setKind(e.target.value as 'material' | 'tool')}
            >
              <option value="material">Material Consumible (para obras y proyectos)</option>
              <option value="tool">Herramienta de Trabajo (equipos y utensilios)</option>
            </select>
          </div>

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
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Nombre de la Subcategoría</Label>
            <Input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Tubos Redondos"
            />
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
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
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
