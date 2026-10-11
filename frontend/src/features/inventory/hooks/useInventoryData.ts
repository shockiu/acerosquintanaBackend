import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { inventoryApi } from '../services/inventoryApi';
import { inventoryKeys } from '../inventory.keys';

export function useInventoryItems() {
  return useQuery({
    queryKey: inventoryKeys.items(),
    queryFn: () => inventoryApi.getItems(),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => inventoryApi.getCategories(),
  });
}

export function useSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: inventoryKeys.subcategories(categoryId),
    queryFn: () => inventoryApi.getSubcategories(categoryId),
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
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) => inventoryApi.registerPurchase(itemId, data),
    onSuccess: () => {
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
