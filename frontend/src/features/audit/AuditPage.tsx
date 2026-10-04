import { useState } from 'react';
import { useAuditLogs } from './hooks/useAuditData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ShieldAlert } from 'lucide-react';
import AuditDiffDialog from './components/AuditDiffDialog';
import type { AuditLog } from './schemas/audit.schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  
  const { data, isLoading, isError } = useAuditLogs({ 
    page, 
    limit: 20, 
    entity: entityFilter !== 'all' ? entityFilter : undefined 
  });
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const getActionBadge = (action: string) => {
    if (action.includes('create')) return <Badge variant="default" className="bg-green-600">Creación</Badge>;
    if (action.includes('update') || action.includes('purchase')) return <Badge variant="secondary">Actualización</Badge>;
    if (action.includes('delete')) return <Badge variant="destructive">Eliminación</Badge>;
    if (action.includes('approve')) return <Badge variant="default" className="bg-blue-600">Aprobación</Badge>;
    if (action.includes('reject')) return <Badge variant="destructive">Rechazo</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Registro de Auditoría" 
        description="Rastreo inmutable de operaciones, aprobaciones y modificaciones en el sistema."
      />

      <div className="flex items-center gap-4 bg-card p-3 border rounded-lg">
        <ShieldAlert className="text-muted-foreground h-5 w-5" />
        <div className="w-[200px]">
          <Select value={entityFilter} onValueChange={v => { setEntityFilter(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Módulos</SelectItem>
              <SelectItem value="inventoryItem">Catálogo / Ítems</SelectItem>
              <SelectItem value="inventoryMovement">Movimientos (Compras)</SelectItem>
              <SelectItem value="work">Obras</SelectItem>
              <SelectItem value="changeRequest">Bandeja de Aprobaciones</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <ErrorState message="Error al cargar los registros de auditoría." />
      ) : (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Acción (Técnica)</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="text-right">Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6}><LoadingState label="Cargando historial..." /></TableCell></TableRow>
                ) : !data || data.logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6}><EmptyState title="Sin registros de auditoría" /></TableCell></TableRow>
                ) : (
                  data.logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{log.entity}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.action}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm">
                        {log.actor?.name || log.actor?.email || 'Sistema / Desconocido'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          <Eye className="h-4 w-4 mr-2" /> Inspeccionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && data.pagination.pages > 1 && (
            <div className="p-4 border-t flex justify-end gap-2 items-center bg-muted/20">
              <span className="text-sm text-muted-foreground mr-4">
                Página {data.pagination.page} de {data.pagination.pages} (Total: {data.pagination.total})
              </span>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          )}
        </div>
      )}

      {selectedLog && (
        <AuditDiffDialog 
          open={!!selectedLog} 
          onOpenChange={(v) => !v && setSelectedLog(null)} 
          log={selectedLog} 
        />
      )}
    </div>
  );
}
