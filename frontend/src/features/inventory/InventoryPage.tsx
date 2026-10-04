import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useInventoryItems } from './hooks/useInventoryData';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '@/components/shared/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreateItemDialog from './components/CreateItemDialog';
import RegisterPurchaseDialog from './components/RegisterPurchaseDialog';
import CreateCategoryDialog from './components/CreateCategoryDialog';
import CreateSubcategoryDialog from './components/CreateSubcategoryDialog';
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

  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (typeof item.subcategory === 'object' && item.subcategory?.name?.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Inventario" 
        description="Catálogo de materiales y herramientas."
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
                  <TableHead className="text-right">Stock</TableHead>
                  {isAdmin && <TableHead className="text-right">Costo Promedio</TableHead>}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={isAdmin ? 6 : 5}><LoadingState label="Cargando catálogo..." /></TableCell></TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 6 : 5}><EmptyState title="Catálogo vacío" /></TableCell></TableRow>
                ) : (
                  filteredItems.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {typeof p.subcategory === 'object' && p.subcategory ? p.subcategory.name : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={p.kind === 'material' ? 'default' : 'secondary'}>
                          {p.kind === 'material' ? 'Material' : 'Herramienta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">{p.stock}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right text-muted-foreground">
                          ${p.avgUnitCost?.toFixed(2) ?? '0.00'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setPurchaseTarget(p)}>
                          <ShoppingCart className="h-4 w-4 mr-2" /> Comprar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
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
    </div>
  );
}
