import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/auditApi';
import { auditKeys } from '../audit.keys';

export function useAuditLogs(params: { page: number; limit: number; entity?: string; action?: string; actor?: string }) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.getLogs(params),
  });
}
