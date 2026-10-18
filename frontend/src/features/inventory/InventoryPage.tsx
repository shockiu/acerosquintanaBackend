import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useInventoryItems } from './hooks/useInventoryData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Plus, ShoppingCart, Scissors, Edit2, Package, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/shared/Pagination';
import CreateItemDialog from './components/CreateItemDialog';
import EditItemDialog from './components/EditItemDialog';
import RegisterPurchaseDialog from './components/RegisterPurchaseDialog';
import ViewRemnantsDialog from './components/ViewRemnantsDialog';
import CatalogManagementView from './components/CatalogManagementView';
import type { InventoryItem } from './schemas/inventory.schema';

export default function InventoryPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useInventoryItems({
    page,
    limit: 10,
    search: search.trim() || undefined,
  });

  const [activeTab, setActiveTab] = useState<'items' | 'catalog'>('items');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<InventoryItem | null>(null);
  const [remnantsTarget, setRemnantsTarget] = useState<InventoryItem | null>(null);

  const items = Array.isArray(data) ? data : data?.items ?? [];
  const pagination = !Array.isArray(data) && data?.pagination ? data.pagination : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Catálogo de materiales y herramientas, con control de taxonomía, piezas y retazos."
        actions={
          isAdmin && activeTab === 'items' && (
            <Button variant="brand" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
            </Button>
          )
        }
      />

      {/* Tabs navigation - Visible only for administrators */}
      {isAdmin && (
        <div className="flex border-b border-border gap-2">
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'items'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('items')}
          >
            <Package className="h-4 w-4" />
            Ítems de Inventario ({pagination ? pagination.total : items.length})
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'catalog'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('catalog')}
          >
            <FolderTree className="h-4 w-4" />
            Categorías y Subcategorías
          </button>
        </div>
      )}

      {isAdmin && activeTab === 'catalog' ? (
        <CatalogManagementView />
      ) : (
        <>
          <div className="rounded-lg border bg-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o subcategoría..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {isError ? (
            <ErrorState message="Error al cargar el inventario." />
          ) : (
            <div className="rounded-lg border bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría / Subcategoría</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Stock (Enteras)</TableHead>
                      <TableHead className="text-center">Retazos Disponibles</TableHead>
                      <TableHead className="text-right">Medida Total</TableHead>
                      {isAdmin && <TableHead className="text-right">Costo Promedio</TableHead>}
                      {isAdmin && <TableHead className="text-right">Valor Total</TableHead>}
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={isAdmin ? 9 : 7}><LoadingState label="Cargando catálogo..." /></TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow><TableCell colSpan={isAdmin ? 9 : 7}><EmptyState title="Catálogo vacío" /></TableCell></TableRow>
                    ) : (
                      items.map((p) => {
                        const unitSymbol = (p.pieceSpec?.measureUnit as any)?.symbol || 'm';

                        return (
                          <TableRow key={p._id}>
                            <TableCell className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {typeof p.subcategory === 'object' && p.subcategory?.imageUrl ? (
                                  <img
                                    src={p.subcategory.imageUrl}
                                    alt={p.subcategory.name}
                                    className="w-7 h-7 rounded object-cover border border-border shadow-xs bg-muted shrink-0"
                                  />
                                ) : null}
                                <span>{typeof p.subcategory === 'object' && p.subcategory ? p.subcategory.name : '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                {p.name}
                                {p.pieceSpec && (
                                  <span className="block text-[11px] text-muted-foreground">
                                    Pieza de {p.pieceSpec.pieceSize} {unitSymbol}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.kind === 'material' ? 'default' : 'secondary'}>
                                {p.kind === 'material' ? 'Material' : 'Herramienta'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-base">
                              {p.stock} {p.pieceSpec ? 'pz' : ''}
                            </TableCell>

                            {/* Remnants Column */}
                            <TableCell className="text-center">
                              {p.pieceSpec ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setRemnantsTarget(p)}
                                >
                                  <Scissors className="h-3 w-3 text-primary" />
                                  {p.availableRemnantsCount ?? 0} retazos
                                  {p.availableRemnantsMeasure !== undefined && p.availableRemnantsMeasure > 0
                                    ? ` (${Number(p.availableRemnantsMeasure).toFixed(2)} ${unitSymbol})`
                                    : ''}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            {/* Total Measure Column */}
                            <TableCell className="text-right text-sm font-semibold">
                              {p.pieceSpec && p.totalMeasure !== undefined
                                ? `${Number(p.totalMeasure).toFixed(2)} ${unitSymbol}`
                                : '-'}
                            </TableCell>

                            {isAdmin && (
                              <TableCell className="text-right text-muted-foreground text-sm">
                                ${p.avgUnitCost?.toFixed(2) ?? '0.00'}
                              </TableCell>
                            )}

                            {isAdmin && (
                              <TableCell className="text-right font-semibold text-sm">
                                ${p.inventoryValue !== undefined
                                  ? Number(p.inventoryValue).toFixed(2)
                                  : ((p.stock || 0) * (p.avgUnitCost || 0)).toFixed(2)}
                              </TableCell>
                            )}

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => setEditTarget(p)}
                                  title={isAdmin ? 'Editar ítem' : 'Ajustar stock'}
                                >
                                  <Edit2 className="h-3.5 w-3.5" /> {isAdmin ? 'Editar' : 'Ajustar Stock'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => setPurchaseTarget(p)}
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" /> Comprar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
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

          {isCreateOpen && <CreateItemDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
          {editTarget && (
            <EditItemDialog
              open={!!editTarget}
              onOpenChange={(v) => !v && setEditTarget(null)}
              item={editTarget}
            />
          )}
          {purchaseTarget && (
            <RegisterPurchaseDialog
              open={!!purchaseTarget}
              onOpenChange={(v) => !v && setPurchaseTarget(null)}
              item={purchaseTarget}
            />
          )}
          {remnantsTarget && (
            <ViewRemnantsDialog
              open={!!remnantsTarget}
              onOpenChange={(v) => !v && setRemnantsTarget(null)}
              item={remnantsTarget}
            />
          )}
        </>
      )}
    </div>
  );
}
