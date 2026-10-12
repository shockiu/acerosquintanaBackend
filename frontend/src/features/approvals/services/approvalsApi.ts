import apiClient from '@/api/axiosClient';
import { changeRequestSchema, paginatedChangeRequestsSchema } from '../schemas/approvals.schema';
import type { ChangeRequest, PaginatedChangeRequests } from '../schemas/approvals.schema';
import { z } from 'zod';

export const approvalsApi = {
  async getPendingRequests(params?: { page?: number; limit?: number; entity?: string }): Promise<ChangeRequest[] | PaginatedChangeRequests> {
    const data = await apiClient.get('/requests', { params });
    if (params?.page) {
      return paginatedChangeRequestsSchema.parse(data);
    }
    const requests = z.array(changeRequestSchema).parse(data);
    return requests.filter(r => r.status === 'pending');
  },

  async approveRequest(id: string, overrides?: Record<string, unknown>) {
    return apiClient.post(`/requests/${id}/approve`, { overrides });
  },

  async rejectRequest(id: string, reason: string) {
    return apiClient.post(`/requests/${id}/reject`, { reason });
  },
};
