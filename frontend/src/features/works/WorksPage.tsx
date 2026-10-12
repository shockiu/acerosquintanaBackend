import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useWorks, useExportWorks } from './hooks/useWorksData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';
import CreateWorkDialog from './components/CreateWorkDialog';
import ViewWorkDetailsDialog from './components/ViewWorkDetailsDialog';
import type { Work } from './schemas/works.schema';

function parseDecimal(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === 'object') {
    if ('$numberDecimal' in val) {
      const parsed = parseFloat(val.$numberDecimal);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof val.toString === 'function') {
      const s = val.toString();
      if (s && s !== '[object Object]') {
        const parsed = parseFloat(s);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  return 0;
}

export default function WorksPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useWorks({ page, limit: 10 });
  const { exportWorks } = useExportWorks();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  const works = Array.isArray(data) ? data : data?.works ?? [];
  const pagination = !Array.isArray(data) && data?.pagination ? data.pagination : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Obras y Mantenimientos"
        description="Historial de trabajos ejecutados, control de cortes y reportes de rentabilidad."
        actions={
          <>
            {isAdmin && works && works.length > 0 && (
              <Button variant="outline" onClick={exportWorks}>
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
              </Button>
            )}
            <Button variant="brand" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Registrar Obra
            </Button>
          </>
        }
      />

      {isError ? (
        <ErrorState message="Error al cargar las obras." />
      ) : (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Operario</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="text-right">Costo Mat.</TableHead>
                      <TableHead className="text-right">Merma</TableHead>
                      <TableHead className="text-right">Cobrado</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={isAdmin ? 9 : 5}><LoadingState label="Cargando obras..." /></TableCell></TableRow>
                ) : !works || works.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 9 : 5}><EmptyState title="Sin obras registradas" /></TableCell></TableRow>
                ) : (
                  works.map((w) => (
                    <TableRow key={w._id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedWork(w)}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(w.performedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{w.clientName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={w.status} />
                          {w.hasPendingReversal && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/50 text-amber-600 bg-amber-500/10 font-medium">
                              Reversión en Cola
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {w.registeredBy?.name || w.registeredBy?.email || '-'}
                      </TableCell>
                      {isAdmin && (
                        <>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            ${parseDecimal(w.materialsCost || w.totalCost).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-amber-600 text-sm">
                            ${parseDecimal(w.wasteCost).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-info font-medium text-sm">
                            ${parseDecimal(w.chargedPrice).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-success font-bold text-sm">
                            ${parseDecimal(w.profit).toFixed(2)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWork(w);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1 text-muted-foreground" /> Ver
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

      {isCreateOpen && <CreateWorkDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
      {selectedWork && (
        <ViewWorkDetailsDialog
          work={selectedWork}
          open={!!selectedWork}
          onOpenChange={(v) => !v && setSelectedWork(null)}
        />
      )}
    </div>
  );
}
