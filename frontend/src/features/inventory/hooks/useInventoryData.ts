import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { inventoryApi } from '../services/inventoryApi';
import { inventoryKeys } from '../inventory.keys';
import { approvalKeys } from '@/features/approvals/approvals.keys';
import type {
  Category,
  Subcategory,
  InventoryItem,
  PaginatedInventoryItems,
  PaginatedCategories,
  PaginatedSubcategories,
} from '../schemas/inventory.schema';

export function useInventoryItems(): UseQueryResult<InventoryItem[]>;
export function useInventoryItems(params: { page: number; limit: number; search?: string; subcategory?: string; kind?: string }): UseQueryResult<PaginatedInventoryItems>;
export function useInventoryItems(params?: { page?: number; limit?: number; search?: string; subcategory?: string; kind?: string }): UseQueryResult<any> {
  return useQuery({
    queryKey: inventoryKeys.items(params),
    queryFn: () => inventoryApi.getItems(params),
  });
}

export function useCategories(): UseQueryResult<Category[]>;
export function useCategories(params: { page: number; limit: number; search?: string }): UseQueryResult<PaginatedCategories>;
export function useCategories(params?: { page?: number; limit?: number; search?: string }): UseQueryResult<any> {
  return useQuery({
    queryKey: inventoryKeys.categories(params),
    queryFn: () => inventoryApi.getCategories(params),
  });
}

export function useSubcategories(categoryId?: string): UseQueryResult<Subcategory[]>;
export function useSubcategories(params: { categoryId?: string; page: number; limit: number }): UseQueryResult<PaginatedSubcategories>;
export function useSubcategories(paramsOrCatId?: string | { categoryId?: string; page?: number; limit?: number }): UseQueryResult<any> {
  return useQuery({
    queryKey: inventoryKeys.subcategories(paramsOrCatId),
    queryFn: () => inventoryApi.getSubcategories(paramsOrCatId),
  });
}

export function useUnits() {
  return useQuery({
    queryKey: inventoryKeys.units(),
    queryFn: () => inventoryApi.getUnits(),
  });
}

export function useItemRemnants(itemId?: string, status?: string) {
  return useQuery({
    queryKey: ['remnants', itemId, status],
    queryFn: () => (itemId ? inventoryApi.getItemRemnants(itemId, status) : Promise.resolve([])),
    enabled: !!itemId,
  });
}

export function useDiscardRemnant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ remnantId, note }: { remnantId: string; note?: string }) =>
      inventoryApi.discardRemnant(remnantId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remnants'] });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      toast.success('Retazo descartado o enviado a aprobación');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al descartar retazo')),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      toast.success('Material creado exitosamente');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al crear material')),
  });
}

export function useRegisterPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) => inventoryApi.registerPurchase(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      toast.success('Compra registrada y enviada a aprobación');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al registrar compra')),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      toast.success('Categoría creada exitosamente');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al crear categoría')),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      toast.success('Categoría actualizada o enviada a aprobación');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al actualizar categoría')),
  });
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createSubcategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.subcategories() });
      toast.success('Subcategoría creada exitosamente');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al crear subcategoría')),
  });
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateSubcategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.subcategories() });
      toast.success('Subcategoría actualizada o enviada a aprobación');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al actualizar subcategoría')),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: ['remnants'] });
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      toast.success('Ítem actualizado o enviado a aprobación');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al actualizar ítem')),
  });
}

