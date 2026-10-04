import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { usePendingRequests } from './hooks/useApprovalsData';
import type { ChangeRequest } from './schemas/approvals.schema';
import ApprovePurchaseDialog from './components/ApprovePurchaseDialog';
import ApproveWorkDialog from './components/ApproveWorkDialog';
import RejectDialog from './components/RejectDialog';

export default function ApprovalsPage() {
  const { data: requests, isLoading, isError } = usePendingRequests();
  
  const [purchaseTarget, setPurchaseTarget] = useState<ChangeRequest | null>(null);
  const [workTarget, setWorkTarget] = useState<ChangeRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ChangeRequest | null>(null);

  const handleApprove = (req: ChangeRequest) => {
    if (req.action === 'purchase') setPurchaseTarget(req);
    else if (req.entity === 'work') setWorkTarget(req);
  };

  const getRequestDescription = (req: ChangeRequest) => {
    if (req.action === 'purchase') {
      return `Llegada de Material: ${req.payload.quantity} unidades`;
    }
    if (req.entity === 'work') {
      return `Obra nueva: ${req.payload.clientName} - ${req.payload.description}`;
    }
    return `Operación genérica: ${req.action} ${req.entity}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Bandeja de Aprobaciones" 
        description="Revisa, asigna precios y aprueba las operaciones realizadas por los operarios."
        actions={
          <Badge variant="secondary">{requests?.length ?? 0} pendientes</Badge>
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
                        <Badge variant="warning">
                          {r.action === 'purchase' ? 'Compra' : r.entity === 'work' ? 'Obra' : 'Otro'}
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
        </div>
      )}

      {purchaseTarget && (
        <ApprovePurchaseDialog open={!!purchaseTarget} onOpenChange={(v) => !v && setPurchaseTarget(null)} request={purchaseTarget} />
      )}
      {workTarget && (
        <ApproveWorkDialog open={!!workTarget} onOpenChange={(v) => !v && setWorkTarget(null)} request={workTarget} />
      )}
      {rejectTarget && (
        <RejectDialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)} request={rejectTarget} />
      )}
    </div>
  );
}
