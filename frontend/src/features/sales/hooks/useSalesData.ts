import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { salesApi } from '../services/salesApi';
import { salesKeys } from '../sales.keys';
import { inventoryKeys } from '@/features/inventory/inventory.keys';
import type { CreateSalePayload, SaleMutationResponse } from '../schemas/sales.schema';

export function useSales(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () => salesApi.getSales(params),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => salesApi.getSaleById(id),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalePayload) => salesApi.createSale(payload),
    onSuccess: (data: SaleMutationResponse) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      if ('isPendingApproval' in data && data.isPendingApproval) {
        toast.success(data.message || 'Solicitud de venta enviada a aprobación del administrador');
      } else {
        toast.success('Venta registrada exitosamente y stock descontado');
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al registrar la venta')),
  });
}

export function useCancelSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.cancelSale(id, reason),
    onSuccess: (data: SaleMutationResponse) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      if ('isPendingApproval' in data && data.isPendingApproval) {
        toast.success(data.message || 'Solicitud de anulación enviada a aprobación del administrador');
      } else {
        toast.success('Venta anulada y stock devuelto al inventario');
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al anular la venta')),
  });
}
