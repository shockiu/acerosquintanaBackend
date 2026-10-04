import { AuditLog } from '../../../../models/AuditLog';

export class AuditUseCases {
  static async listLogs(filters: any, page: number = 1, limit: number = 20) {
    const query: any = {};
    if (filters.actor) query.actor = filters.actor;
    if (filters.action) query.action = filters.action;
    if (filters.entity) query.entity = filters.entity;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name email'),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
