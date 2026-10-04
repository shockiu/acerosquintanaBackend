import apiClient from '@/api/axiosClient';
import { auditResponseSchema } from '../schemas/audit.schema';

export const auditApi = {
  async getLogs(params?: { page?: number; limit?: number; actor?: string; entity?: string; action?: string }) {
    const data = await apiClient.get('/audit', { params });
    return auditResponseSchema.parse(data);
  },
};
