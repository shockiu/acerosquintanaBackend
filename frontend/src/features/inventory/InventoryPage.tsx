import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useInventoryItems } from './hooks/useInventoryData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Plus, ShoppingCart, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreateItemDialog from './components/CreateItemDialog';
import RegisterPurchaseDialog from './components/RegisterPurchaseDialog';
import CreateCategoryDialog from './components/CreateCategoryDialog';
import CreateSubcategoryDialog from './components/CreateSubcategoryDialog';
import ViewRemnantsDialog from './components/ViewRemnantsDialog';
import type { InventoryItem } from './schemas/inventory.schema';

export default function InventoryPage() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';
  const { data: items, isLoading, isError } = useInventoryItems();
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<InventoryItem | null>(null);
  const [remnantsTarget, setRemnantsTarget] = useState<InventoryItem | null>(null);

  const filteredItems = items?.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (typeof item.subcategory === 'object' && item.subcategory?.name?.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Catálogo de materiales y herramientas, con control de piezas y retazos."
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCategoryOpen(true)}>
                Nueva Categoría
              </Button>
              <Button variant="outline" onClick={() => setIsSubcategoryOpen(true)}>
                Nueva Subcategoría
              </Button>
              <Button variant="brand" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
              </Button>
            </div>
          )
        }
      />

      <div className="rounded-lg border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 9 : 7}><EmptyState title="Catálogo vacío" /></TableCell></TableRow>
                ) : (
                  filteredItems.map((p) => {
                    const unitSymbol = (p.pieceSpec?.measureUnit as any)?.symbol || 'm';

                    return (
                      <TableRow key={p._id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {typeof p.subcategory === 'object' && p.subcategory ? p.subcategory.name : '-'}
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
                          <Button variant="outline" size="sm" onClick={() => setPurchaseTarget(p)}>
                            <ShoppingCart className="h-4 w-4 mr-1.5" /> Comprar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {isCreateOpen && <CreateItemDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
      {isCategoryOpen && <CreateCategoryDialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen} />}
      {isSubcategoryOpen && <CreateSubcategoryDialog open={isSubcategoryOpen} onOpenChange={setIsSubcategoryOpen} />}
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
    </div>
  );
}
