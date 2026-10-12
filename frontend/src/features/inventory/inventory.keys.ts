export const inventoryKeys = {
  all: ['inventory'] as const,
  items: (params?: any) => (params !== undefined ? [...inventoryKeys.all, 'items', params] : [...inventoryKeys.all, 'items']),
  categories: (params?: any) => (params !== undefined ? [...inventoryKeys.all, 'categories', params] : [...inventoryKeys.all, 'categories']),
  subcategories: (catIdOrParams?: any) => (catIdOrParams !== undefined ? [...inventoryKeys.all, 'subcategories', catIdOrParams] : [...inventoryKeys.all, 'subcategories']),
  units: () => [...inventoryKeys.all, 'units'],
};
