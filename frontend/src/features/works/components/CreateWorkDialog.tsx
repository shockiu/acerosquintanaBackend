import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateWork } from '../hooks/useWorksData';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import { inventoryApi } from '@/features/inventory/services/inventoryApi';
import { Plus, Trash2, Scissors, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import type { InventoryItem, Remnant } from '@/features/inventory/schemas/inventory.schema';

interface WorkLineState {
  item: string;
  mode?: 'pieces' | 'measure' | 'waste';
  source?: 'whole_piece' | 'remnant';
  remnant?: string;
  quantity?: number;
  measureUsed?: number;
  note?: string;
}

export default function CreateWorkDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: createWork, isPending } = useCreateWork();
  const { data: inventoryItems } = useInventoryItems();

  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().split('T')[0]);
  const [chargedPrice, setChargedPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<WorkLineState[]>([]);

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { item: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, patch: Partial<WorkLineState>) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], ...patch };
    setSelectedItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      alert('Debes agregar al menos un material o herramienta.');
      return;
    }

    for (let i = 0; i < selectedItems.length; i++) {
      const line = selectedItems[i];
      if (!line.item) {
        alert(`Selecciona un ítem en la fila #${i + 1}`);
        return;
      }

      const invItem = inventoryItems?.find(it => it._id === line.item);
      if (invItem?.pieceSpec) {
        if (line.mode === 'pieces' && (!line.quantity || line.quantity <= 0)) {
          alert(`Indica la cantidad de piezas enteras en la fila #${i + 1}`);
          return;
        }
        if (line.mode === 'measure') {
          if (!line.measureUsed || line.measureUsed <= 0) {
            alert(`Indica la medida a utilizar en la fila #${i + 1}`);
            return;
          }
          if (line.source === 'remnant' && !line.remnant) {
            alert(`Selecciona qué retazo utilizarás en la fila #${i + 1}`);
            return;
          }
        }
        if (line.mode === 'waste' && !line.remnant) {
          alert(`Selecciona el retazo a registrar como merma en la fila #${i + 1}`);
          return;
        }
      } else {
        if (!line.quantity || line.quantity <= 0) {
          alert(`Indica una cantidad válida en la fila #${i + 1}`);
          return;
        }
      }
    }

    const payload: any = {
      clientName,
      description,
      performedAt: new Date(performedAt).toISOString(),
      items: selectedItems.map(l => {
        const inv = inventoryItems?.find(it => it._id === l.item);
        if (inv?.pieceSpec) {
          if (l.mode === 'pieces') {
            return { item: l.item, mode: 'pieces', quantity: Number(l.quantity) };
          }
          if (l.mode === 'measure') {
            return {
              item: l.item,
              mode: 'measure',
              source: l.source || 'whole_piece',
              remnant: l.source === 'remnant' ? l.remnant : undefined,
              measureUsed: Number(l.measureUsed),
            };
          }
          if (l.mode === 'waste') {
            return {
              item: l.item,
              mode: 'waste',
              remnant: l.remnant,
              note: l.note,
            };
          }
        }
        return { item: l.item, quantity: Number(l.quantity) };
      }),
    };

    if (isAdmin && chargedPrice) {
      payload.chargedPrice = Number(chargedPrice);
    }

    createWork(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Obra</DialogTitle>
          <DialogDescription>
            Documenta el trabajo realizado. Puedes consumir materiales por piezas enteras o por medidas específicas (generando o reutilizando retazos).
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
              <div>
                <Label className="text-base font-semibold">Materiales y Herramientas Consumidos</Label>
                <p className="text-xs text-muted-foreground">
                  Para materiales con seguimiento por pieza puedes especificar piezas enteras (ej. 2 tubos) o medidas exactas de corte (ej. 2.7m).
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" /> Añadir Material
              </Button>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-3 text-center">No se han añadido materiales para esta obra.</p>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((line, index) => {
                  const currentItem = inventoryItems?.find(it => it._id === line.item);
                  return (
                    <WorkItemRow
                      key={index}
                      index={index}
                      line={line}
                      item={currentItem}
                      allItems={inventoryItems || []}
                      onChange={(patch) => updateLine(index, patch)}
                      onRemove={() => handleRemoveItem(index)}
                    />
                  );
                })}
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

function WorkItemRow({
  line,
  item,
  allItems,
  onChange,
  onRemove,
}: {
  index?: number;
  line: WorkLineState;
  item?: InventoryItem;
  allItems: InventoryItem[];
  onChange: (patch: Partial<WorkLineState>) => void;
  onRemove: () => void;
}) {
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [isLoadingRemnants, setIsLoadingRemnants] = useState(false);

  const hasPieceSpec = !!item?.pieceSpec;
  const pieceSize = Number(item?.pieceSpec?.pieceSize || 0);
  const minUsable = Number(item?.pieceSpec?.minUsableMeasure || 0);
  const unitSymbol = (item?.pieceSpec?.measureUnit as any)?.symbol || 'm';

  useEffect(() => {
    if (line.item && hasPieceSpec) {
      setIsLoadingRemnants(true);
      inventoryApi.getItemRemnants(line.item, 'available')
        .then(data => setRemnants(data))
        .catch(() => setRemnants([]))
        .finally(() => setIsLoadingRemnants(false));
    } else {
      setRemnants([]);
    }
  }, [line.item, hasPieceSpec]);

  const handleItemSelect = (itemId: string) => {
    const selected = allItems.find(it => it._id === itemId);
    if (selected?.pieceSpec) {
      onChange({
        item: itemId,
        mode: 'pieces', // default mode for piece-tracked items
        quantity: 1,
        source: 'whole_piece',
        measureUsed: undefined,
        remnant: undefined,
      });
    } else {
      onChange({
        item: itemId,
        mode: undefined,
        quantity: 1,
        source: undefined,
        measureUsed: undefined,
        remnant: undefined,
      });
    }
  };

  // Preview calculation for measure from whole piece
  let feedbackMessage: string | null = null;
  let feedbackType: 'info' | 'warning' | 'success' = 'info';

  if (hasPieceSpec && line.mode === 'measure' && line.measureUsed && line.measureUsed > 0) {
    if (line.source === 'whole_piece' && pieceSize > 0) {
      const piecesNeeded = Math.ceil(line.measureUsed / pieceSize);
      const remainder = (piecesNeeded * pieceSize) - line.measureUsed;

      if (remainder === 0) {
        feedbackMessage = `Se consumirán exactamente ${piecesNeeded} pieza(s) de ${pieceSize} ${unitSymbol}. No habrá sobrante.`;
        feedbackType = 'info';
      } else if (minUsable > 0 && remainder < minUsable) {
        feedbackMessage = `Se consumirán ${piecesNeeded} pieza(s). Sobrarán ${remainder.toFixed(2)} ${unitSymbol}, que se registrarán como MERMA (menor al mínimo usable de ${minUsable} ${unitSymbol}).`;
        feedbackType = 'warning';
      } else {
        feedbackMessage = `Se consumirán ${piecesNeeded} pieza(s). Quedará un RETAZO DISPONIBLE de ${remainder.toFixed(2)} ${unitSymbol} para futuras obras.`;
        feedbackType = 'success';
      }
    } else if (line.source === 'remnant' && line.remnant) {
      const selectedRemnant = remnants.find(r => r._id === line.remnant);
      if (selectedRemnant) {
        const remMeasure = Number(selectedRemnant.measure);
        if (line.measureUsed > remMeasure) {
          feedbackMessage = `¡Atención! La medida usada (${line.measureUsed} ${unitSymbol}) supera lo disponible en este retazo (${remMeasure} ${unitSymbol}).`;
          feedbackType = 'warning';
        } else {
          const remainder = remMeasure - line.measureUsed;
          if (remainder === 0) {
            feedbackMessage = `El retazo de ${remMeasure} ${unitSymbol} se consumirá en su totalidad.`;
            feedbackType = 'info';
          } else if (minUsable > 0 && remainder < minUsable) {
            feedbackMessage = `Sobrarán ${remainder.toFixed(2)} ${unitSymbol}, que se clasificarán como MERMA (< ${minUsable} ${unitSymbol}).`;
            feedbackType = 'warning';
          } else {
            feedbackMessage = `Sobrarán ${remainder.toFixed(2)} ${unitSymbol}, que quedarán como un nuevo RETAZO DISPONIBLE.`;
            feedbackType = 'success';
          }
        }
      }
    }
  }

  return (
    <div className="bg-muted/40 p-3 rounded-lg border space-y-2 text-sm">
      <div className="flex gap-2 items-center">
        {/* Item Selector */}
        <select
          required
          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={line.item}
          onChange={e => handleItemSelect(e.target.value)}
        >
          <option value="">Selecciona un ítem...</option>
          {allItems.map(inv => (
            <option key={inv._id} value={inv._id}>
              {inv.name} (Stock: {inv.stock} {inv.pieceSpec ? 'piezas' : ''})
              {inv.pieceSpec && inv.availableRemnantsCount ? ` [+${inv.availableRemnantsCount} retazos]` : ''}
            </option>
          ))}
        </select>

        {/* Delete Row Button */}
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Piece-tracked specific options */}
      {hasPieceSpec ? (
        <div className="bg-background/80 p-2.5 rounded-md border space-y-2 text-xs">
          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground">Forma de consumo:</span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={line.mode === 'pieces' ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => onChange({ mode: 'pieces', quantity: line.quantity || 1, source: undefined, measureUsed: undefined, remnant: undefined })}
              >
                <Package className="h-3.5 w-3.5 mr-1" />
                Piezas enteras (tubos completos)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={line.mode === 'measure' ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => onChange({ mode: 'measure', source: 'whole_piece', measureUsed: line.measureUsed || pieceSize, quantity: undefined })}
              >
                <Scissors className="h-3.5 w-3.5 mr-1" />
                Por medida ({unitSymbol})
              </Button>
              {remnants.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant={line.mode === 'waste' ? 'destructive' : 'outline'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => onChange({ mode: 'waste', remnant: remnants[0]?._id, quantity: undefined, measureUsed: undefined })}
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  Descartar retazo dañado
                </Button>
              )}
            </div>
          </div>

          {/* Mode: Pieces */}
          {line.mode === 'pieces' && (
            <div className="flex items-center gap-3 pt-1">
              <Label className="text-xs">Cantidad de piezas enteras a descontar:</Label>
              <Input
                type="number"
                min="1"
                step="1"
                required
                className="w-28 h-8 text-xs bg-background"
                placeholder="Ej. 2"
                value={line.quantity || ''}
                onChange={e => onChange({ quantity: Number(e.target.value) })}
              />
              <span className="text-muted-foreground">
                (Cada pieza mide {pieceSize} {unitSymbol}. Total: {((line.quantity || 0) * pieceSize).toFixed(2)} {unitSymbol})
              </span>
            </div>
          )}

          {/* Mode: Measure */}
          {line.mode === 'measure' && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs">Cortar desde:</Label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={line.source || 'whole_piece'}
                  onChange={e => onChange({ source: e.target.value as 'whole_piece' | 'remnant', remnant: undefined })}
                >
                  <option value="whole_piece">Pieza nueva / entera ({pieceSize} {unitSymbol})</option>
                  <option value="remnant" disabled={remnants.length === 0}>
                    Retazo existente {remnants.length > 0 ? `(${remnants.length} disp.)` : '(no hay retazos)'}
                  </option>
                </select>

                {line.source === 'remnant' && (
                  <select
                    required
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1 min-w-[180px]"
                    value={line.remnant || ''}
                    onChange={e => onChange({ remnant: e.target.value })}
                    disabled={isLoadingRemnants}
                  >
                    <option value="">Selecciona qué retazo cortar...</option>
                    {remnants.map(r => (
                      <option key={r._id} value={r._id}>
                        Retazo de {Number(r.measure).toFixed(2)} {unitSymbol} (de obra: {(r.originWork as any)?.clientName || 'General'})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <Label className="text-xs">Medida usada:</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    className="w-24 h-8 text-xs bg-background"
                    placeholder={`En ${unitSymbol}`}
                    value={line.measureUsed || ''}
                    onChange={e => onChange({ measureUsed: Number(e.target.value) })}
                  />
                  <span className="text-muted-foreground font-semibold">{unitSymbol}</span>
                </div>
              </div>

              {/* Dynamic feedback message */}
              {feedbackMessage && (
                <div className={`p-2 rounded text-xs flex items-center gap-1.5 ${
                  feedbackType === 'warning'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                    : feedbackType === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Mode: Manual Waste */}
          {line.mode === 'waste' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-destructive">Retazo a descartar:</Label>
                <select
                  required
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1"
                  value={line.remnant || ''}
                  onChange={e => onChange({ remnant: e.target.value })}
                >
                  <option value="">Selecciona el retazo dañado...</option>
                  {remnants.map(r => (
                    <option key={r._id} value={r._id}>
                      Retazo de {Number(r.measure).toFixed(2)} {unitSymbol}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                className="h-8 text-xs bg-background"
                placeholder="Motivo del descarte / daño (opcional)"
                value={line.note || ''}
                onChange={e => onChange({ note: e.target.value })}
              />
            </div>
          )}
        </div>
      ) : (
        /* Regular / Legacy Item */
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Cantidad:</Label>
          <Input
            type="number"
            required
            min="0.01"
            step="any"
            className="w-28 h-8 text-xs bg-background"
            placeholder="Cant."
            value={line.quantity || ''}
            onChange={e => onChange({ quantity: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
