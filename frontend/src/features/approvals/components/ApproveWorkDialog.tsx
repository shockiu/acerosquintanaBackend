import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApproveRequest } from '../hooks/useApprovalsData';
import { useInventoryItems } from '@/features/inventory/hooks/useInventoryData';
import type { ChangeRequest } from '../schemas/approvals.schema';

export default function ApproveWorkDialog({ open, onOpenChange, request }: { open: boolean, onOpenChange: (open: boolean) => void, request: ChangeRequest }) {
  const { mutate: approve, isPending } = useApproveRequest();
  const [chargedPrice, setChargedPrice] = useState('');
  const { data: inventoryData } = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : ((inventoryData as any)?.items ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approve({ id: request._id, overrides: { chargedPrice: Number(chargedPrice) } }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  const payload = request.payload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aprobar Obra / Trabajo</DialogTitle>
          <DialogDescription>
            Obra para el cliente <strong>{payload.clientName}</strong>.
            Se procesará el consumo de materiales, deducción de stock y generación de retazos / mermas.
          </DialogDescription>
        </DialogHeader>

        {payload.items && payload.items.length > 0 && (
          <div className="space-y-1.5 p-3 bg-muted/40 rounded-md border text-xs">
            <span className="font-semibold text-muted-foreground block mb-1">Detalle de consumo solicitado:</span>
            {payload.items.map((it: any, idx: number) => {
              const inv = typeof it.item === 'object' && it.item
                ? it.item
                : inventoryItems.find((i: any) => i._id === it.item);
              const name = it.itemName || inv?.name || `Material #${idx + 1}`;
              const unitSymbol = it.unitSymbol || (inv?.pieceSpec?.measureUnit as any)?.symbol || 'm';

              return (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b last:border-0 gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground block truncate">{name}</span>
                    {inv?.description && (
                      <span className="text-[10px] text-muted-foreground block truncate">{inv.description}</span>
                    )}
                  </div>
                  <span className="font-medium text-primary text-right shrink-0">
                    {it.mode === 'pieces'
                      ? `${it.quantity} pz. enteras`
                      : it.mode === 'measure'
                      ? `${it.measureUsed} ${unitSymbol} (${it.source === 'whole_piece' ? 'pieza nueva' : 'retazo'})`
                      : it.mode === 'waste'
                      ? 'Descarte de retazo'
                      : `${it.quantity} unid.`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Precio Cobrado al Cliente $</Label>
            <Input 
              type="number" 
              required 
              min="0"
              step="0.01"
              value={chargedPrice} 
              onChange={e => setChargedPrice(e.target.value)} 
              placeholder="Ej. 1200.00" 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" variant="brand" disabled={isPending}>{isPending ? 'Procesando...' : 'Aprobar Obra'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
