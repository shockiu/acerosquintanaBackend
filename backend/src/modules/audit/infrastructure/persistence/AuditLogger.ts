import { IAuditLogger, IAuditLogData } from '../../domain/IAuditLogger';
import { AuditLog } from '../../../../models/AuditLog';
import { ClientSession } from 'mongoose';

export class MongoAuditLogger implements IAuditLogger {
  async log(data: IAuditLogData, tx?: ClientSession): Promise<void> {
    const doc = new AuditLog({
      ...data,
      createdAt: new Date(),
    });

    if (tx) {
      await doc.save({ session: tx });
    } else {
      await doc.save();
    }
  }
}

export const auditLogger = new MongoAuditLogger();
