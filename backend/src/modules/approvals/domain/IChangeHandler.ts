import { ClientSession } from 'mongoose';
import { IChangeRequest } from '../../../models/ChangeRequest';

export interface ActionContext {
  actorId: string;
  role: 'admin' | 'user';
  ip?: string;
}

export interface IChangeHandler {
  entity: string;
  action: string;
  apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: ClientSession): Promise<any>;
}
