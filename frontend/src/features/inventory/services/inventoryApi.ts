import apiClient from '@/api/axiosClient';
import {
  categorySchema,
  inventoryItemSchema,
  remnantSchema,
  subcategorySchema,
  unitSchema,
  paginatedInventoryItemsSchema,
  paginatedCategoriesSchema,
  paginatedSubcategoriesSchema,
} from '../schemas/inventory.schema';
import { z } from 'zod';

export const inventoryApi = {
  async getUnits() {
    const data = await apiClient.get('/catalog/units');
    return z.array(unitSchema).parse(data);
  },
  async getCategories(params?: { page?: number; limit?: number; search?: string }): Promise<any> {
    const data = await apiClient.get('/catalog/categories', { params });
    if (params?.page) {
      return paginatedCategoriesSchema.parse(data);
    }
    return z.array(categorySchema).parse(data);
  },
  async getSubcategories(paramsOrCatId?: string | { categoryId?: string; page?: number; limit?: number }): Promise<any> {
    const params = typeof paramsOrCatId === 'string'
      ? { category: paramsOrCatId }
      : paramsOrCatId
        ? { category: paramsOrCatId.categoryId, page: paramsOrCatId.page, limit: paramsOrCatId.limit }
        : undefined;
    const data = await apiClient.get('/catalog/subcategories', { params });
    if (typeof paramsOrCatId === 'object' && paramsOrCatId?.page) {
      return paginatedSubcategoriesSchema.parse(data);
    }
    return z.array(subcategorySchema).parse(data);
  },
  async createCategory(payload: { name: string; description?: string }) {
    return apiClient.post('/catalog/categories', payload);
  },
  async updateCategory(id: string, payload: { name?: string; description?: string; isActive?: boolean }) {
    return apiClient.patch(`/catalog/categories/${id}`, payload);
  },
  async createSubcategory(payload: { category: string; name: string; unit: string; kind?: 'material' | 'tool' }) {
    return apiClient.post('/catalog/subcategories', payload);
  },
  async updateSubcategory(id: string, payload: { category?: string; name?: string; unit?: string; kind?: 'material' | 'tool'; isActive?: boolean }) {
    return apiClient.patch(`/catalog/subcategories/${id}`, payload);
  },

  async getItems(params?: { page?: number; limit?: number; search?: string; subcategory?: string; kind?: string }): Promise<any> {
    const data = await apiClient.get('/inventory/items', { params });
    if (params?.page) {
      return paginatedInventoryItemsSchema.parse(data);
    }
    return z.array(inventoryItemSchema).parse(data);
  },
  async createItem(payload: {
    subcategory: string;
    name: string;
    kind: 'material' | 'tool';
    pieceSpec?: {
      pieceSize: number;
      measureUnit: string;
      minUsableMeasure?: number;
    };
  }) {
    return apiClient.post('/inventory/items', payload);
  },
  async updateItem(id: string, payload: {
    subcategory?: string;
    name?: string;
    description?: string;
    kind?: 'material' | 'tool';
    pieceSpec?: {
      pieceSize: number;
      measureUnit: string;
      minUsableMeasure?: number;
    } | null;
    isActive?: boolean;
  }) {
    return apiClient.patch(`/inventory/items/${id}`, payload);
  },

  async registerPurchase(itemId: string, payload: {
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    note?: string;
  }) {
    return apiClient.post(`/inventory/items/${itemId}/purchases`, payload);
  },
  async getItemRemnants(itemId: string, status?: string) {
    const params = status ? { status } : undefined;
    const data = await apiClient.get(`/inventory/items/${itemId}/remnants`, { params });
    return z.array(remnantSchema).parse(data);
  },
  async discardRemnant(remnantId: string, note?: string) {
    return apiClient.post(`/inventory/remnants/${remnantId}/discard`, { note });
  },
};
