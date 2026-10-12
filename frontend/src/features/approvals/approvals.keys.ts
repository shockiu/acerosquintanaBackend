export const approvalKeys = {
  all: ['approvals'] as const,
  pending: (params?: any) => (params !== undefined ? [...approvalKeys.all, 'pending', params] : [...approvalKeys.all, 'pending']),
};
