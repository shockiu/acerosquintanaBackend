import { useState } from 'react';
import { useSales } from './hooks/useSalesData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/shared/Pagination';
import CreateSaleDialog from './components/CreateSaleDialog';
import ViewSaleDetailsDialog from './components/ViewSaleDetailsDialog';
import { 
  Plus, 
  Search, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Layers 
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import type { Sale } from './schemas/sales.schema';

export default function SalesPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'completed' | 'cancelled'>('all');

  const { data, isLoading, isError } = useSales({
    page,
    limit: 10,
    search: search.trim() || undefined,
    status: status !== 'all' ? status : undefined,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const sales = data?.sales ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas Directas de Materiales y Herramientas"
        description={
          isAdmin
            ? "Gestión comercial de ventas a terceros con descuento automático de stock y cálculo de ganancias netas."
            : "Registro de ventas de materiales y herramientas para el taller con control y trazabilidad de inventario."
        }
        actions={
          <Button
            variant="brand"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" /> {isAdmin ? 'Registrar Venta Directa' : 'Registrar Venta'}
          </Button>
        }
      />

      {/* KPI Cards (Admin Only) */}
      {isAdmin && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Facturación Total */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Facturación Total</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${summary ? summary.totalRevenue.toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-muted-foreground">Ingresos brutos por ventas directas</p>
        </div>

        {/* Card 2: Costo de Adquisición */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Costo de Mercancía</span>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            ${summary ? summary.totalCost.toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-muted-foreground">Costo de inventario de lo vendido</p>
        </div>

        {/* Card 3: Ganancia Neta */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Ganancia Neta</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ${summary ? summary.totalProfit.toFixed(2) : '0.00'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Margen de rentabilidad:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {summary ? summary.profitMargin.toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>

        {/* Card 4: Total Ventas */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Operaciones Exitosas</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {summary ? summary.completedCount : 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Ventas completadas no anuladas</p>
        </div>
      </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por comprador, folio, notas..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Todos los estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="No se pudo cargar la información de ventas directas." />
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <EmptyState
            title="No se encontraron ventas directas"
            description={
              search || status !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda.'
                : 'Registra la primera venta directa para comenzar a llevar el control comercial de materiales y herramientas.'
            }
          />
          <Button
            variant="brand"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4" /> Registrar Venta Directa
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 h-10 text-xs">
                  <TableHead className="font-semibold">Folio / Fecha</TableHead>
                  <TableHead className="font-semibold">Cliente / Comprador</TableHead>
                  <TableHead className="font-semibold">Mercancía Vendida</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="text-right font-semibold">Total Venta</TableHead>
                      <TableHead className="text-right font-semibold">Costo Compra</TableHead>
                      <TableHead className="text-right font-semibold">Ganancia Neta</TableHead>
                    </>
                  )}
                  <TableHead className="text-center font-semibold">Estado</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled';
                  const totalAmt = Number(sale.totalAmount || 0);
                  const totalCst = Number(sale.totalCost || 0);
                  const netProf = Number(sale.profit || 0);
                  const margin = sale.profitMargin != null ? Number(sale.profitMargin) : (totalAmt > 0 ? (netProf / totalAmt) * 100 : 0);

                  return (
                    <TableRow key={sale._id} className="h-14 text-xs hover:bg-muted/20">
                      {/* Folio & Date */}
                      <TableCell className="py-3 font-medium">
                        <div>
                          <span className="font-mono font-bold text-foreground block">
                            {sale.folio || 'VTA-S/F'}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            {new Date(sale.performedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>

                      {/* Buyer */}
                      <TableCell className="py-3 font-semibold text-foreground max-w-[200px]">
                        <span className="truncate block">{sale.buyerName}</span>
                        {sale.notes && (
                          <span className="text-[11px] text-muted-foreground font-normal truncate block">
                            {sale.notes}
                          </span>
                        )}
                      </TableCell>

                      {/* Items Preview */}
                      <TableCell className="py-3 max-w-[240px]">
                        <div className="space-y-0.5">
                          {sale.items.slice(0, 2).map((it, i) => (
                            <div key={i} className="flex items-center gap-1.5 truncate">
                              <span className="font-medium text-foreground">
                                {Number(it.quantity)}x
                              </span>
                              <span className="truncate text-muted-foreground">
                                {it.name}
                              </span>
                            </div>
                          ))}
                          {sale.items.length > 2 && (
                            <span className="text-[10px] text-primary font-medium block">
                              +{sale.items.length - 2} ítem(s) más
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Admin-only financial cells */}
                      {isAdmin && (
                        <>
                          {/* Total Sale */}
                          <TableCell className="text-right py-3 font-bold text-sm text-foreground font-mono">
                            ${totalAmt.toFixed(2)}
                          </TableCell>

                          {/* Total Cost */}
                          <TableCell className="text-right py-3 text-muted-foreground font-mono">
                            ${totalCst.toFixed(2)}
                          </TableCell>

                          {/* Profit */}
                          <TableCell className="text-right py-3 font-mono">
                            <div className="space-y-0.5">
                              <span className={`font-bold block ${netProf >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                {netProf >= 0 ? '+' : ''}${netProf.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                ({margin.toFixed(1)}%)
                              </span>
                            </div>
                          </TableCell>
                        </>
                      )}

                      {/* Status */}
                      <TableCell className="text-center py-3">
                        {isCancelled ? (
                          <Badge variant="destructive" className="text-[10px] gap-1 h-5 px-2">
                            <XCircle className="h-3 w-3" /> Anulada
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Completada
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSale(sale)}
                          className="h-8 gap-1 text-xs hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.pages > 1 && (
            <Pagination
              page={page}
              totalPages={pagination.pages}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <CreateSaleDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}

      {selectedSale && (
        <ViewSaleDetailsDialog
          sale={selectedSale}
          open={!!selectedSale}
          onOpenChange={v => !v && setSelectedSale(null)}
        />
      )}
    </div>
  );
}
