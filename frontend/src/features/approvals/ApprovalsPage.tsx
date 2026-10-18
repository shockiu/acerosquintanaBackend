import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { usePendingRequests } from './hooks/useApprovalsData';
import type { ChangeRequest } from './schemas/approvals.schema';
import ApprovePurchaseDialog from './components/ApprovePurchaseDialog';
import ApproveWorkDialog from './components/ApproveWorkDialog';
import ApproveReversalDialog from './components/ApproveReversalDialog';
import ApproveRemnantDiscardDialog from './components/ApproveRemnantDiscardDialog';
import ApproveUpdateDialog from './components/ApproveUpdateDialog';
import RejectDialog from './components/RejectDialog';

import ApproveSaleDialog from './components/ApproveSaleDialog';
import ApproveSaleCancelDialog from './components/ApproveSaleCancelDialog';

export default function ApprovalsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePendingRequests({ page, limit: 10 });

  const requests = Array.isArray(data) ? data : data?.requests ?? [];
  const pagination = !Array.isArray(data) && data?.pagination ? data.pagination : null;
  
  const [purchaseTarget, setPurchaseTarget] = useState<ChangeRequest | null>(null);
  const [workTarget, setWorkTarget] = useState<ChangeRequest | null>(null);
  const [reversalTarget, setReversalTarget] = useState<ChangeRequest | null>(null);
  const [remnantDiscardTarget, setRemnantDiscardTarget] = useState<ChangeRequest | null>(null);
  const [updateTarget, setUpdateTarget] = useState<ChangeRequest | null>(null);
  const [saleTarget, setSaleTarget] = useState<ChangeRequest | null>(null);
  const [saleCancelTarget, setSaleCancelTarget] = useState<ChangeRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ChangeRequest | null>(null);

  const handleApprove = (req: ChangeRequest) => {
    if (req.action === 'purchase') {
      setPurchaseTarget(req);
    } else if (req.entity === 'sale' && req.action === 'create') {
      setSaleTarget(req);
    } else if (req.entity === 'sale' && req.action === 'cancel') {
      setSaleCancelTarget(req);
    } else if (req.entity === 'work' && req.action === 'delete') {
      setReversalTarget(req);
    } else if (req.entity === 'work') {
      setWorkTarget(req);
    } else if (req.entity === 'remnant' && req.action === 'discard') {
      setRemnantDiscardTarget(req);
    } else if (req.action === 'update' || (req.entity === 'inventoryItem' && req.action === 'create')) {
      setUpdateTarget(req);
    }
  };

  const getRequestDescription = (req: ChangeRequest) => {
    const targetName = req.targetName || req.targetDoc?.name || req.targetDoc?.clientName || req.payload?.name || req.payload?.itemName || '';

    if (req.entity === 'sale' && req.action === 'create') {
      const buyer = req.payload?.buyerName || 'Cliente General';
      const itemsList = req.payload?.items || [];
      const itemsSummary = itemsList.length > 0
        ? itemsList.map((i: any) => `${i.quantity}x ${i.name || 'Ítem'}`).join(', ')
        : (targetName ? targetName.replace(/^Venta a [^:]+:\s*/, '') : 'Ítems');
      return `Venta Directa: ${buyer} — [${itemsSummary}]`;
    }
    if (req.entity === 'sale' && req.action === 'cancel') {
      const reason = req.payload?.reason ? ` - Motivo: "${req.payload.reason}"` : '';
      return `Anulación de Venta: ${targetName}${reason}`;
    }
    if (req.action === 'purchase') {
      const matName = targetName || req.payload?.name || req.payload?.itemName || 'Material';
      return `Llegada de Material: ${matName} (${req.payload?.quantity ?? 0} unidades)`;
    }
    if (req.entity === 'work' && req.action === 'delete') {
      const workDesc = targetName || req.targetDoc?.description || req.payload?.description || (req.payload?.clientName ? `${req.payload.clientName} - ${req.payload.description}` : 'Obra');
      return `Reversión de Obra: ${workDesc}`;
    }
    if (req.entity === 'work') {
      return `Obra nueva: ${req.payload?.clientName || 'Sin cliente'} - ${req.payload?.description || ''}`;
    }
    if (req.entity === 'remnant' && req.action === 'discard') {
      const remName = targetName || (req.targetDoc?.itemName ? `${req.targetDoc.itemName} (${req.targetDoc.measure}m)` : (req.payload?.itemName ? `${req.payload.itemName} (${req.payload.measure}m)` : 'Retazo'));
      return `Descarte de Retazo: ${remName}${req.payload?.note ? ` (${req.payload.note})` : ''}`;
    }
    if (req.action === 'update') {
      const entName = req.entity === 'inventoryItem' ? 'Ítem' : req.entity === 'category' ? 'Categoría' : 'Subcategoría';
      const resolvedName = req.payload?.name || req.payload?.itemName || targetName || req.targetDoc?.name;
      const displayName = resolvedName ? `"${resolvedName}"` : '';
      const stockChange = req.payload?.stock !== undefined ? ` [Stock a: ${req.payload.stock}]` : '';
      const reason = req.payload?.adjustmentReason ? ` - Motivo: "${req.payload.adjustmentReason}"` : '';
      return `Ajuste de ${entName}${displayName ? `: ${displayName}` : ''}${stockChange}${reason}`;
    }
    if (req.entity === 'inventoryItem' && req.action === 'create') {
      return `Nuevo Ítem: ${req.payload?.name || '-'}`;
    }
    return `Operación: ${req.action} ${req.entity}${targetName ? ` (${targetName})` : ''}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Bandeja de Aprobaciones" 
        description="Revisa, asigna precios y aprueba las operaciones realizadas por los operarios."
        actions={
          <Badge variant="secondary">{pagination ? pagination.total : requests.length} pendientes</Badge>
        }
      />

      {isError ? (
        <ErrorState message="Error al cargar las peticiones." />
      ) : (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Operario</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5}><LoadingState label="Cargando bandeja..." /></TableCell></TableRow>
                ) : !requests || requests.length === 0 ? (
                  <TableRow><TableCell colSpan={5}><EmptyState title="Bandeja limpia" description="No hay peticiones pendientes." /></TableCell></TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.requestedBy?.name || r.requestedBy?.email?.split('@')[0] || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.action === 'delete' || (r.entity === 'sale' && r.action === 'cancel')
                              ? 'destructive'
                              : r.entity === 'remnant'
                              ? 'secondary'
                              : r.action === 'update'
                              ? 'default'
                              : r.entity === 'sale' && r.action === 'create'
                              ? 'default'
                              : 'warning'
                          }
                        >
                          {r.action === 'purchase'
                            ? 'Compra'
                            : r.entity === 'sale' && r.action === 'create'
                            ? 'Venta'
                            : r.entity === 'sale' && r.action === 'cancel'
                            ? 'Anulación Venta'
                            : r.entity === 'work' && r.action === 'delete'
                            ? 'Reversión'
                            : r.entity === 'work'
                            ? 'Obra'
                            : r.entity === 'remnant' && r.action === 'discard'
                            ? 'Descarte Retazo'
                            : r.action === 'update'
                            ? (r.payload?.stock !== undefined ? 'Ajuste Stock' : 'Modificación')
                            : r.action === 'create' && r.entity === 'inventoryItem'
                            ? 'Nuevo Ítem'
                            : 'Otro'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getRequestDescription(r)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setRejectTarget(r)}>
                          <XCircle className="h-4 w-4 mr-1 text-destructive" /> Rechazar
                        </Button>
                        <Button variant="brand" size="sm" onClick={() => handleApprove(r)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && (
            <Pagination
              page={page}
              totalPages={pagination.pages}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {purchaseTarget && (
        <ApprovePurchaseDialog open={!!purchaseTarget} onOpenChange={(v) => !v && setPurchaseTarget(null)} request={purchaseTarget} />
      )}
      {saleTarget && (
        <ApproveSaleDialog open={!!saleTarget} onOpenChange={(v) => !v && setSaleTarget(null)} request={saleTarget} />
      )}
      {saleCancelTarget && (
        <ApproveSaleCancelDialog open={!!saleCancelTarget} onOpenChange={(v) => !v && setSaleCancelTarget(null)} request={saleCancelTarget} />
      )}
      {workTarget && (
        <ApproveWorkDialog open={!!workTarget} onOpenChange={(v) => !v && setWorkTarget(null)} request={workTarget} />
      )}
      {reversalTarget && (
        <ApproveReversalDialog open={!!reversalTarget} onOpenChange={(v) => !v && setReversalTarget(null)} request={reversalTarget} />
      )}
      {remnantDiscardTarget && (
        <ApproveRemnantDiscardDialog open={!!remnantDiscardTarget} onOpenChange={(v) => !v && setRemnantDiscardTarget(null)} request={remnantDiscardTarget} />
      )}
      {updateTarget && (
        <ApproveUpdateDialog open={!!updateTarget} onOpenChange={(v) => !v && setUpdateTarget(null)} request={updateTarget} />
      )}
      {rejectTarget && (
        <RejectDialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)} request={rejectTarget} />
      )}
    </div>
  );
}
