import apiClient from '@/api/axiosClient';
import { categorySchema, inventoryItemSchema, subcategorySchema, unitSchema } from '../schemas/inventory.schema';
import { z } from 'zod';

export const inventoryApi = {
  async getUnits() {
    const data = await apiClient.get('/catalog/units');
    return z.array(unitSchema).parse(data);
  },
  async getCategories() {
    const data = await apiClient.get('/catalog/categories');
    return z.array(categorySchema).parse(data);
  },
  async getSubcategories(categoryId?: string) {
    const params = categoryId ? { category: categoryId } : undefined;
    const data = await apiClient.get('/catalog/subcategories', { params });
    return z.array(subcategorySchema).parse(data);
  },
  async createCategory(payload: { name: string; description?: string }) {
    return apiClient.post('/catalog/categories', payload);
  },
  async createSubcategory(payload: { category: string; name: string; unit: string }) {
    return apiClient.post('/catalog/subcategories', payload);
  },
  async getItems() {
    const data = await apiClient.get('/inventory/items');
    return z.array(inventoryItemSchema).parse(data);
  },
  async createItem(payload: { subcategory: string; name: string; kind: 'material' | 'tool' }) {
    return apiClient.post('/inventory/items', payload);
  },
  async registerPurchase(itemId: string, payload: { quantity: number; note?: string }) {
    return apiClient.post(`/inventory/items/${itemId}/purchases`, payload);
  },
};
