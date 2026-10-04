import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Pagination({ page, totalPages, onPageChange, disabled }: { page: number, totalPages: number, onPageChange: (p: number) => void, disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
