import { IChangeHandler } from './IChangeHandler';

class ChangeHandlerRegistry {
  private handlers = new Map<string, IChangeHandler>();

  register(handler: IChangeHandler) {
    const key = `${handler.entity}:${handler.action}`;
    this.handlers.set(key, handler);
  }

  get(entity: string, action: string): IChangeHandler {
    const key = `${entity}:${action}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new Error(`No handler registered for ${key}`);
    }
    return handler;
  }
}

export const changeHandlerRegistry = new ChangeHandlerRegistry();
