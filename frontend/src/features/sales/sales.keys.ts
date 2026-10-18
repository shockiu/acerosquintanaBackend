export const salesKeys = {
  all: ['sales'] as const,
  list: (params?: Record<string, any>) => ['sales', 'list', params] as const,
  detail: (id: string) => ['sales', 'detail', id] as const,
};
