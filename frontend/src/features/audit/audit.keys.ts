export const auditKeys = {
  all: ['audit'],
  list: (params: Record<string, unknown>) => [...auditKeys.all, 'list', params],
};
