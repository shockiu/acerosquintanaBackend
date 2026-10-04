export const inventoryKeys = {
  all: ['inventory'],
  items: () => [...inventoryKeys.all, 'items'],
  categories: () => [...inventoryKeys.all, 'categories'],
  subcategories: (catId?: string) => [...inventoryKeys.all, 'subcategories', catId ?? 'all'],
  units: () => [...inventoryKeys.all, 'units'],
};
