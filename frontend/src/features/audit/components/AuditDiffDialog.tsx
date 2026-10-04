import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { AuditLog } from '../schemas/audit.schema';

export default function AuditDiffDialog({ open, onOpenChange, log }: { open: boolean, onOpenChange: (open: boolean) => void, log: AuditLog }) {
  
  const formatJSON = (data: unknown) => {
    if (!data) return 'N/A';
    return JSON.stringify(data, null, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Auditoría: {log.action}</DialogTitle>
          <DialogDescription>
            ID de Entidad: {typeof log.entityId === 'object' ? JSON.stringify(log.entityId) : log.entityId || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="border rounded-md bg-muted/30 flex flex-col">
            <div className="bg-destructive/10 text-destructive text-sm font-semibold p-2 border-b">Estado Anterior (Before)</div>
            <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap">
              {formatJSON(log.before)}
            </pre>
          </div>
          
          <div className="border rounded-md bg-muted/30 flex flex-col">
            <div className="bg-success/10 text-success text-sm font-semibold p-2 border-b">Estado Nuevo (After)</div>
            <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap">
              {formatJSON(log.after)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
