import { describe, it, expect } from 'vitest';
import { changeHandlerRegistry } from './ChangeHandlerRegistry';
import { IChangeHandler } from './IChangeHandler';

describe('ChangeHandlerRegistry', () => {
  it('registers and retrieves a change handler by entity and action', () => {
    const dummyHandler: IChangeHandler = {
      entity: 'dummy',
      action: 'test',
      apply: async () => ({ success: true }),
    };

    changeHandlerRegistry.register(dummyHandler);
    const retrieved = changeHandlerRegistry.get('dummy', 'test');
    expect(retrieved).toBe(dummyHandler);
  });

  it('throws an error when attempting to get an unregistered handler', () => {
    expect(() => {
      changeHandlerRegistry.get('nonexistent', 'action');
    }).toThrow('No handler registered for nonexistent:action');
  });
});
