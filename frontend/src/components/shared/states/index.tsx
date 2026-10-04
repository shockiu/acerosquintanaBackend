import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ErrorState({ message = 'No se pudo cargar la información.' }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" /> {message}
    </div>
  );
}

export function EmptyState({ title = 'Sin resultados', description }: { title?: string, description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="rounded-full bg-muted p-3"><Inbox className="h-5 w-5 text-muted-foreground" /></div>
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function LoadingState({ label = 'Cargando...', fullScreen = false }: { label?: string, fullScreen?: boolean }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground', fullScreen && 'min-h-screen bg-background')}>
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
