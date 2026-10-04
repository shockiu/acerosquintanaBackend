import apiClient from '@/api/axiosClient';
import { changeRequestSchema } from '../schemas/approvals.schema';
import { z } from 'zod';

export const approvalsApi = {
  async getPendingRequests() {
    const data = await apiClient.get('/requests');
    // Filtrar solo pending (aunque el backend ya podría hacerlo)
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
