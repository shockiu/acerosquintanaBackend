export const worksKeys = {
  all: ['works'] as const,
  list: (params?: any) => (params !== undefined ? [...worksKeys.all, 'list', params] : [...worksKeys.all, 'list']),
};
