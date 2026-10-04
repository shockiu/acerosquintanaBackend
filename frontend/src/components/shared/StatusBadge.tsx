import { Badge } from '@/components/ui/badge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STATUS_MAP: Record<string, { label: string, variant: any }> = {
  active:    { label: 'Activo',     variant: 'success' },
  approved:  { label: 'Aprobado',   variant: 'success' },
  pending:   { label: 'Pendiente',  variant: 'warning' },
  pending_approval: { label: 'Pendiente Aprob.', variant: 'warning' },
  in_review: { label: 'En revisión', variant: 'info' },
  suspended: { label: 'Suspendido', variant: 'danger' },
  rejected:  { label: 'Rechazado',  variant: 'danger' },
  inactive:  { label: 'Inactivo',   variant: 'neutral' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status ?? '-', variant: 'neutral' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
