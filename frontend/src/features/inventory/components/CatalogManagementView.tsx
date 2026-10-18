import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useCategories, useSubcategories } from '../hooks/useInventoryData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit2, Layers, FolderTree } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { Pagination } from '@/components/shared/Pagination';
import type { Category, Subcategory } from '../schemas/inventory.schema';
import EditCategoryDialog from './EditCategoryDialog';
import EditSubcategoryDialog from './EditSubcategoryDialog';
import CreateCategoryDialog from './CreateCategoryDialog';
import CreateSubcategoryDialog from './CreateSubcategoryDialog';

export default function CatalogManagementView() {
  const { admin } = useAuth();
  const isAdmin = admin?.role === 'admin';

  if (!isAdmin) {
    return null;
  }

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data: categoriesData, isLoading: loadingCats } = useCategories({
    page,
    limit: 8,
    search: search.trim() || undefined,
  });
  const { data: subcategoriesData, isLoading: loadingSubs } = useSubcategories();

  const categories: Category[] = categoriesData?.categories ?? [];
  const subcategories: Subcategory[] = subcategoriesData ?? [];
  const pagination = categoriesData?.pagination ?? null;

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [isNewSubcategoryOpen, setIsNewSubcategoryOpen] = useState(false);

  const filteredCategories = categories;

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar categorías o subcategorías..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={() => setIsNewCategoryOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nueva Categoría
          </Button>
          <Button variant="brand" size="sm" onClick={() => setIsNewSubcategoryOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nueva Subcategoría
          </Button>
        </div>
      </div>

      {loadingCats || loadingSubs ? (
        <LoadingState label="Cargando catálogo..." />
      ) : filteredCategories.length === 0 ? (
        <EmptyState title="No se encontraron categorías" description="Crea una categoría para organizar el catálogo." />
      ) : (
        <div className="space-y-4">
          {filteredCategories.map(cat => {
            const subsForCat = subcategories?.filter(
              s => (typeof s.category === 'object' ? s.category?._id : s.category) === cat._id
            ) ?? [];

            return (
              <div key={cat._id} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                {/* Category Header */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
                  <div className="flex items-center gap-2.5">
                    <FolderTree className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-foreground">{cat.name}</h3>
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          {subsForCat.length} {subsForCat.length === 1 ? 'subcategoría' : 'subcategorías'}
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingCategory(cat)}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar Categoría
                  </Button>
                </div>

                {/* Subcategories Table */}
                {subsForCat.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground italic text-center">
                    Sin subcategorías registradas en esta categoría.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 text-xs">
                        <TableHead className="w-1/3">Nombre Subcategoría</TableHead>
                        <TableHead>Clasificación</TableHead>
                        <TableHead>Unidad de Medida</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subsForCat.map(sub => {
                        const unitName = typeof sub.unit === 'object' && sub.unit ? `${sub.unit.name} (${sub.unit.symbol || '-'})` : '-';

                        return (
                          <TableRow key={sub._id} className="hover:bg-muted/20">
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-2.5">
                                {sub.imageUrl ? (
                                  <img
                                    src={sub.imageUrl}
                                    alt={sub.name}
                                    className="w-8 h-8 rounded object-cover border border-border shadow-xs bg-muted shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded border border-dashed border-border flex items-center justify-center bg-muted/40 shrink-0">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span>{sub.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sub.kind === 'tool' ? 'secondary' : 'default'} className="text-xs">
                                {sub.kind === 'tool' ? 'Herramienta' : 'Material Consumible'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {unitName}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setEditingSubcategory(sub)}
                              >
                                <Edit2 className="h-3 w-3" /> Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}

          {pagination && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <Pagination
                page={page}
                totalPages={pagination.pages}
                total={pagination.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {editingCategory && (
        <EditCategoryDialog
          open={!!editingCategory}
          onOpenChange={(v) => !v && setEditingCategory(null)}
          category={editingCategory}
        />
      )}
      {editingSubcategory && (
        <EditSubcategoryDialog
          open={!!editingSubcategory}
          onOpenChange={(v) => !v && setEditingSubcategory(null)}
          subcategory={editingSubcategory}
        />
      )}
      {isNewCategoryOpen && (
        <CreateCategoryDialog
          open={isNewCategoryOpen}
          onOpenChange={setIsNewCategoryOpen}
        />
      )}
      {isNewSubcategoryOpen && (
        <CreateSubcategoryDialog
          open={isNewSubcategoryOpen}
          onOpenChange={setIsNewSubcategoryOpen}
        />
      )}
    </div>
  );
}
