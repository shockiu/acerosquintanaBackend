import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (p: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled,
  className = '',
}: PaginationProps) {
  if (totalPages <= 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-muted/10 ${className}`}>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Página <span className="font-semibold text-foreground">{page}</span> de{' '}
        <span className="font-semibold text-foreground">{totalPages}</span>
        {total !== undefined && (
          <span className="ml-1 text-muted-foreground">({total} en total)</span>
        )}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
