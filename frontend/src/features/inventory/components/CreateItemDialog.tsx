import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCreateItem, useSubcategories, useUnits } from '../hooks/useInventoryData';
import { toast } from 'sonner';

export default function CreateItemDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate: create, isPending } = useCreateItem();
  const { data: subcategories, isLoading: isLoadingSubcats } = useSubcategories();
  const { data: units } = useUnits();

  const [name, setName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [kind, setKind] = useState<'material' | 'tool'>('material');

  // Piece spec tracking
  const [enablePieceTracking, setEnablePieceTracking] = useState(false);
  const [pieceSize, setPieceSize] = useState('');
  const [measureUnit, setMeasureUnit] = useState('');
  const [minUsableMeasure, setMinUsableMeasure] = useState('');

  const cuttableUnits = units?.filter(u => u.allowsDecimals) ?? [];
  const displayUnits = cuttableUnits.length > 0 ? cuttableUnits : (units ?? []);

  const handleSubcategoryChange = (subId: string) => {
    setSubcategory(subId);
    const selected = subcategories?.find(s => s._id === subId);
    if (selected?.kind) {
      setKind(selected.kind);
      if (selected.kind === 'tool') {
        setEnablePieceTracking(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      name,
      subcategory,
      kind,
    };

    if (kind === 'material' && enablePieceTracking) {
      if (!pieceSize || Number(pieceSize) <= 0) {
        toast.error('El tamaño estándar de la pieza debe ser mayor a 0');
        return;
      }
      if (!measureUnit) {
        toast.error('Selecciona la unidad de medida para el corte (ej. Metro)');
        return;
      }

      const selectedUnitObj = units?.find(u => u._id === measureUnit);
      if (selectedUnitObj && selectedUnitObj.allowsDecimals === false) {
        toast.error(`La unidad "${selectedUnitObj.name}" es indivisible (no permite decimales). Para control de retazos debes seleccionar una unidad dimensional continua como Metro o Centímetro.`);
        return;
      }

      payload.pieceSpec = {
        pieceSize: Number(pieceSize),
        measureUnit,
        minUsableMeasure: minUsableMeasure ? Number(minUsableMeasure) : undefined,
      };
    }

    create(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Ítem de Inventario</DialogTitle>
          <DialogDescription>Añade un nuevo material o herramienta al catálogo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Subcategoría</Label>
            <select
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={subcategory}
              onChange={e => handleSubcategoryChange(e.target.value)}
              disabled={isLoadingSubcats}
            >
              <option value="">Selecciona subcategoría...</option>
              {subcategories?.map(sub => (
                <option key={sub._id} value={sub._id}>
                  {sub.name} ({sub.kind === 'tool' ? 'Herramienta' : 'Material'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Nombre del Ítem</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Tubo redondo 2 pulgadas" />
          </div>

          {subcategory && (
            <div className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-md bg-muted/40 border">
              <span className="text-muted-foreground font-medium">Clasificación heredada:</span>
              <Badge variant={kind === 'material' ? 'default' : 'secondary'}>
                {kind === 'material' ? 'Material Consumible' : 'Herramienta de Trabajo'}
              </Badge>
            </div>
          )}

          {kind === 'tool' && subcategory && (
            <div className="p-3 border rounded-lg bg-muted/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Herramienta de trabajo ordinaria</p>
              <p>Este ítem se gestionará como herramienta en inventario sin control de cortes ni retazos.</p>
            </div>
          )}

          {kind === 'material' && (
            <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enablePieceTracking"
                    checked={enablePieceTracking}
                    onChange={e => setEnablePieceTracking(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="enablePieceTracking" className="cursor-pointer font-medium text-sm">
                    Seguimiento por piezas / barras (control de retazos)
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Solo para materiales que se cortan por longitud (tubos, perfiles, vigas). No activar para consumibles directos ni piezas indivisibles.
                </p>
              </div>

              {enablePieceTracking && (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Medida de 1 pieza entera</Label>
                      <Input
                        type="number"
                        step="any"
                        required={enablePieceTracking}
                        min="0.001"
                        placeholder="Ej. 6 ó 2"
                        value={pieceSize}
                        onChange={e => setPieceSize(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unidad de corte (dimensión)</Label>
                      <select
                        required={enablePieceTracking}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
                        value={measureUnit}
                        onChange={e => setMeasureUnit(e.target.value)}
                      >
                        <option value="">Selecciona unidad (Metro, etc.)...</option>
                        {displayUnits.map(u => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.symbol}){u.allowsDecimals ? ' - Cortable' : ''}
                          </option>
                        ))}
                      </select>
                      {cuttableUnits.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Solo unidades continuas/cortables.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Mínimo utilizable antes de considerarse merma (opcional)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Ej. 0.3 (metros)"
                      value={minUsableMeasure}
                      onChange={e => setMinUsableMeasure(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Cualquier sobrante de corte menor a esta medida se descartará automáticamente como merma de obra.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Creando...' : 'Crear Ítem'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
