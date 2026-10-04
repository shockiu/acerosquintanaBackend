import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useWorks, useExportWorks } from './hooks/useWorksData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import CreateWorkDialog from './components/CreateWorkDialog';

export default function WorksPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { data: works, isLoading, isError } = useWorks();
  const { exportWorks } = useExportWorks();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Obras y Mantenimientos" 
        description="Historial de trabajos ejecutados y reportes de rentabilidad."
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
                      <TableHead className="text-right">Cobrado</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={isAdmin ? 7 : 4}><LoadingState label="Cargando obras..." /></TableCell></TableRow>
                ) : !works || works.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 7 : 4}><EmptyState title="Sin obras registradas" /></TableCell></TableRow>
                ) : (
                  works.map((w) => (
                    <TableRow key={w._id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(w.performedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{w.clientName}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-sm">
                        {w.registeredBy?.name || w.registeredBy?.email || '-'}
                      </TableCell>
                      {isAdmin && (
                        <>
                          <TableCell className="text-right text-muted-foreground">
                            ${w.totalCost?.toFixed(2) ?? '0.00'}
                          </TableCell>
                          <TableCell className="text-right text-info font-medium">
                            ${w.chargedPrice?.toFixed(2) ?? '0.00'}
                          </TableCell>
                          <TableCell className="text-right text-success font-bold">
                            ${w.profit?.toFixed(2) ?? '0.00'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {isCreateOpen && <CreateWorkDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
    </div>
  );
}
