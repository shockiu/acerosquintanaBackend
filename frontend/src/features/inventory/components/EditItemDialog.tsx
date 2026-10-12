import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

import { useUpdateItem, useSubcategories, useUnits } from '../hooks/useInventoryData';
import type { InventoryItem } from '../schemas/inventory.schema';
import { AlertCircle } from 'lucide-react';

export default function EditItemDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { mutate: update, isPending } = useUpdateItem();
  const { data: subcategories, isLoading: isLoadingSubcats } = useSubcategories();
  const { data: units } = useUnits();

  const initialSubId = typeof item.subcategory === 'object' && item.subcategory ? item.subcategory._id : ((item.subcategory as string) || '');
  const initialMeasureUnit = item.pieceSpec?.measureUnit
    ? typeof item.pieceSpec.measureUnit === 'object'
      ? item.pieceSpec.measureUnit._id
      : item.pieceSpec.measureUnit
    : '';

  const initialStock = item.stock !== undefined && item.stock !== null ? String(item.stock) : '0';
  const initialCost = item.avgUnitCost !== undefined && item.avgUnitCost !== null ? String(item.avgUnitCost) : '';

  const [name, setName] = useState(item.name);
  const [subcategory, setSubcategory] = useState(initialSubId);
  const [kind, setKind] = useState<'material' | 'tool'>(item.kind);

  // Stock and quantities
  const [stock, setStock] = useState(initialStock);
  const [avgUnitCost, setAvgUnitCost] = useState(initialCost);
  const [clearRemnants, setClearRemnants] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Piece spec tracking
  const [enablePieceTracking, setEnablePieceTracking] = useState(!!item.pieceSpec);
  const [pieceSize, setPieceSize] = useState(item.pieceSpec ? String(item.pieceSpec.pieceSize) : '');
  const [measureUnit, setMeasureUnit] = useState(initialMeasureUnit);
  const [minUsableMeasure, setMinUsableMeasure] = useState(
    item.pieceSpec?.minUsableMeasure !== undefined && item.pieceSpec.minUsableMeasure !== null
      ? String(item.pieceSpec.minUsableMeasure)
      : ''
  );

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

    if (!isAdmin) {
      if (stock === '') {
        toast.error('Indica la cantidad en stock');
        return;
      }
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        toast.error('El stock debe ser un número mayor o igual a 0');
        return;
      }
      if (!adjustmentReason.trim()) {
        toast.error('Indica el motivo del ajuste para que el administrador pueda revisarlo');
        return;
      }

      const payload: any = {
        name: item.name,
        itemName: item.name,
        stock: numStock,
        adjustmentReason: adjustmentReason.trim(),
      };
      if (clearRemnants) {
        payload.clearRemnants = true;
      }

      update(
        { id: item._id, data: payload },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
      return;
    }

    const payload: any = {
      name,
      subcategory,
      kind,
    };

    if (kind === 'material') {
      if (enablePieceTracking) {
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
          toast.error(`La unidad "${selectedUnitObj.name}" es indivisible (no permite decimales). Para control de retazos debes seleccionar una unidad continua.`);
          return;
        }

        payload.pieceSpec = {
          pieceSize: Number(pieceSize),
          measureUnit,
          minUsableMeasure: minUsableMeasure ? Number(minUsableMeasure) : undefined,
        };
      } else {
        // Explicitly clear pieceSpec if previously enabled
        payload.pieceSpec = null;
      }
    } else {
      payload.pieceSpec = null;
    }

    if (stock !== '') {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        toast.error('El stock debe ser un número mayor o igual a 0');
        return;
      }
      payload.stock = numStock;
    }

    if (clearRemnants) {
      payload.clearRemnants = true;
    }

    if (adjustmentReason.trim()) {
      payload.adjustmentReason = adjustmentReason.trim();
    }

    if (isAdmin && avgUnitCost !== '') {
      const numCost = Number(avgUnitCost);
      if (!isNaN(numCost) && numCost >= 0) {
        payload.avgUnitCost = numCost;
      }
    }

    update(
      { id: item._id, data: payload },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const currentSubName =
    typeof item.subcategory === 'object' && item.subcategory
      ? item.subcategory.name
      : subcategories?.find(s => s._id === initialSubId)?.name || '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isAdmin ? 'Editar Ítem de Inventario' : 'Ajustar Stock de Ítem'}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Modifica los datos del material o herramienta en el catálogo.'
              : 'Registra un ajuste de cantidades disponibles que será enviado a revisión y aprobación por el administrador.'}
          </DialogDescription>
        </DialogHeader>

        {!isAdmin && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Como usuario operario, esta modificación de stock se registrará como un ajuste y se enviará a aprobación previa del administrador.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdmin ? (
            /* Ficha de solo lectura del ítem para usuarios operadores */
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material / Ítem:</span>
                <span className="font-semibold text-foreground text-sm">{item.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subcategoría:</span>
                <span className="font-medium text-foreground">{currentSubName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de Ítem:</span>
                <span className="font-medium text-foreground capitalize">
                  {item.kind === 'tool' ? 'Herramienta' : 'Material Consumible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock actual registrado:</span>
                <span className="font-bold text-foreground">
                  {initialStock} {item.pieceSpec ? 'piezas' : 'unidades'}
                </span>
              </div>
              {item.pieceSpec && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Medida estándar:</span>
                  <span className="text-foreground">
                    {item.pieceSpec.pieceSize} {units?.find(u => u._id === initialMeasureUnit)?.symbol || 'm'} por pieza
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Campos estructurales completos exclusivos para Administradores */
            <>
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
                <Input
                  required
                  placeholder="Ej. Tubo Redondo 1 pulg Cal. 18"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Ítem</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="itemKindEdit"
                      value="material"
                      checked={kind === 'material'}
                      onChange={() => setKind('material')}
                    />
                    Material Consumible
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="itemKindEdit"
                      value="tool"
                      checked={kind === 'tool'}
                      onChange={() => {
                        setKind('tool');
                        setEnablePieceTracking(false);
                      }}
                    />
                    Herramienta / Equipo
                  </label>
                </div>
              </div>

              {kind === 'material' && (
                <div className="pt-2 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Control Dimensional y Retazos</Label>
                      <p className="text-xs text-muted-foreground">
                        Actívalo para materiales que vienen en barras o perfiles y admiten cortes y retazos.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                      checked={enablePieceTracking}
                      onChange={e => setEnablePieceTracking(e.target.checked)}
                    />
                  </div>

                  {enablePieceTracking && (
                    <div className="p-3 bg-muted/40 rounded-lg space-y-3 border">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tamaño por Pieza</Label>
                          <Input
                            required={enablePieceTracking}
                            type="number"
                            step="any"
                            placeholder="Ej. 6"
                            value={pieceSize}
                            onChange={e => setPieceSize(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unidad de Medida (Corte)</Label>
                          <select
                            required={enablePieceTracking}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={measureUnit}
                            onChange={e => setMeasureUnit(e.target.value)}
                          >
                            <option value="">Selecciona unidad...</option>
                            {displayUnits.map(u => (
                              <option key={u._id} value={u._id}>
                                {u.name} ({u.symbol || '-'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Medida Mínima Útil (Retazo descartable si es menor)</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Ej. 0.30"
                          value={minUsableMeasure}
                          onChange={e => setMinUsableMeasure(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Gestión de Existencias y Cantidades */}
          <div className={isAdmin ? "pt-3 border-t space-y-3" : "space-y-3"}>
            <div>
              <Label className="text-sm font-semibold">
                {isAdmin ? 'Existencias y Cantidades Disponibles' : 'Nuevo Stock Disponible'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Permite corregir o eliminar existencias si hubo error de registro, merma física o vaciado.'
                  : 'Ingresa la cantidad física real para solicitar el ajuste.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  {enablePieceTracking ? 'Piezas Enteras en Stock' : 'Cantidad en Stock'}
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  required
                />
              </div>

              {isAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs">Costo Unitario Promedio ($)</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={avgUnitCost}
                    onChange={e => setAvgUnitCost(e.target.value)}
                  />
                </div>
              )}
            </div>

            {Boolean(item.availableRemnantsCount && item.availableRemnantsCount > 0) && (
              <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive">
                <input
                  type="checkbox"
                  id="clearRemnantsCheck"
                  className="mt-0.5 h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive cursor-pointer"
                  checked={clearRemnants}
                  onChange={e => setClearRemnants(e.target.checked)}
                />
                <label htmlFor="clearRemnantsCheck" className="cursor-pointer">
                  <span className="font-semibold block">Descartar / eliminar también retazos sobrantes</span>
                  <span>
                    Este ítem tiene {item.availableRemnantsCount} retazos (
                    {Number(item.availableRemnantsMeasure || 0).toFixed(2)}{' '}
                    {(item.pieceSpec?.measureUnit as any)?.symbol || 'm'}). Marca esta casilla para descartarlos todos.
                  </span>
                </label>
              </div>
            )}

            {(!isAdmin || stock !== initialStock || clearRemnants) && (
              <div className="space-y-1">
                <Label className="text-xs">
                  Motivo del Ajuste {!isAdmin && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  required={!isAdmin}
                  placeholder={!isAdmin ? "Justifica el motivo del ajuste para el administrador..." : "Ej. Conteo erróneo, material dañado, merma física..."}
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={isPending}>
              {isPending ? 'Guardando...' : isAdmin ? 'Guardar Cambios' : 'Solicitar Ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
