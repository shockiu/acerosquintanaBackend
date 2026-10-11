import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useWorks, useExportWorks } from './hooks/useWorksData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Download, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import CreateWorkDialog from './components/CreateWorkDialog';
import ViewWorkDetailsDialog from './components/ViewWorkDetailsDialog';
import type { Work } from './schemas/works.schema';

export default function WorksPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { data: works, isLoading, isError } = useWorks();
  const { exportWorks } = useExportWorks();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

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
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {w.registeredBy?.name || w.registeredBy?.email || '-'}
                      </TableCell>
                      {isAdmin && (
                        <>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            ${Number(w.materialsCost || w.totalCost || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-amber-600 text-sm">
                            ${Number(w.wasteCost || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-info font-medium text-sm">
                            ${Number(w.chargedPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-success font-bold text-sm">
                            ${Number(w.profit || 0).toFixed(2)}
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
