import apiClient from '@/api/axiosClient';
import { paginatedSalesSchema, saleSchema, saleMutationResponseSchema } from '../schemas/sales.schema';
import type { Sale, PaginatedSales, CreateSalePayload, SaleMutationResponse } from '../schemas/sales.schema';

export const salesApi = {
  async getSales(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedSales> {
    const data = await apiClient.get('/sales', { params });
    return paginatedSalesSchema.parse(data);
  },

  async getSaleById(id: string): Promise<Sale> {
    const data = await apiClient.get(`/sales/${id}`);
    return saleSchema.parse(data);
  },

  async createSale(payload: CreateSalePayload): Promise<SaleMutationResponse> {
    const data = await apiClient.post('/sales', payload);
    return saleMutationResponseSchema.parse(data);
  },

  async cancelSale(id: string, reason: string): Promise<SaleMutationResponse> {
    const data = await apiClient.post(`/sales/${id}/cancel`, { reason });
    return saleMutationResponseSchema.parse(data);
  },
};
