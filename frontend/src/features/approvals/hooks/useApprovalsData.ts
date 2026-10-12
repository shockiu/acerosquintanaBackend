import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { approvalsApi } from '../services/approvalsApi';
import { approvalKeys } from '../approvals.keys';
import { inventoryKeys } from '@/features/inventory/inventory.keys';
import { worksKeys } from '@/features/works/works.keys';
import type { ChangeRequest, PaginatedChangeRequests } from '../schemas/approvals.schema';

export function usePendingRequests(): UseQueryResult<ChangeRequest[]>;
export function usePendingRequests(params: { page: number; limit: number; entity?: string }): UseQueryResult<PaginatedChangeRequests>;
export function usePendingRequests(params?: { page?: number; limit?: number; entity?: string }): UseQueryResult<any> {
  return useQuery({
    queryKey: approvalKeys.pending(params),
    queryFn: () => approvalsApi.getPendingRequests(params),
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, overrides }: { id: string; overrides?: Record<string, unknown> }) => 
      approvalsApi.approveRequest(id, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.pending() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['remnants'] });
      queryClient.invalidateQueries({ queryKey: worksKeys.all });
      toast.success('Petición aprobada y procesada correctamente');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al aprobar la petición')),
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      approvalsApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.pending() });
      toast.success('Petición rechazada');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al rechazar la petición')),
  });
}
