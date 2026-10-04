import apiClient from '@/api/axiosClient';
import { workSchema } from '../schemas/works.schema';
import { z } from 'zod';

export const worksApi = {
  async getWorks() {
    const data = await apiClient.get('/works');
    return z.array(workSchema).parse(data);
  },
  
  async createWork(payload: {
    clientName: string;
    description?: string;
    performedAt: string;
    items: { item: string; quantity: number }[];
  }) {
    return apiClient.post('/works', payload);
  },

  getExportUrl() {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/exports/works`;
  }
};
