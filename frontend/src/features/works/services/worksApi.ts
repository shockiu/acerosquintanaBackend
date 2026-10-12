import apiClient from '@/api/axiosClient';
import { workSchema, paginatedWorksSchema } from '../schemas/works.schema';
import type { Work, PaginatedWorks } from '../schemas/works.schema';
import { z } from 'zod';

export type WorkItemLineInput =
  | { item: string; mode: 'pieces'; quantity: number }
  | { item: string; mode: 'measure'; source: 'whole_piece'; measureUsed: number }
  | { item: string; mode: 'measure'; source: 'remnant'; remnant: string; measureUsed: number }
  | { item: string; mode: 'waste'; remnant: string; note?: string }
  | { item: string; quantity: number };

export interface CreateWorkPayload {
  clientName: string;
  description?: string;
  performedAt: string;
  chargedPrice?: number;
  items: WorkItemLineInput[];
}

export const worksApi = {
  async getWorks(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<Work[] | PaginatedWorks> {
    const data = await apiClient.get('/works', { params });
    if (params?.page) {
      return paginatedWorksSchema.parse(data);
    }
    return z.array(workSchema).parse(data);
  },

  async getWorkById(id: string) {
    const data = await apiClient.get(`/works/${id}`);
    return workSchema.parse(data);
  },
  
  async createWork(payload: CreateWorkPayload) {
    return apiClient.post('/works', payload);
  },

  async reverseWork(id: string) {
    return apiClient.post(`/works/${id}/reverse`);
  },

  getExportUrl() {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/exports/works`;
  }
};
