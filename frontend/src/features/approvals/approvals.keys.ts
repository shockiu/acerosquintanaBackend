export const approvalKeys = {
  all: ['approvals'],
  pending: () => [...approvalKeys.all, 'pending'],
};
