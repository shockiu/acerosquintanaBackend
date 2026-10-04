export interface IAuditLogData {
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: any;
  after?: any;
  ip?: string;
}

export interface IAuditLogger {
  log(data: IAuditLogData, tx?: any): Promise<void>;
}
