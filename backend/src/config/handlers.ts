import { changeHandlerRegistry } from '../modules/approvals/domain/ChangeHandlerRegistry';
import { CreateItemHandler } from '../modules/inventory/domain/handlers/CreateItemHandler';
import { PurchaseHandler } from '../modules/inventory/domain/handlers/PurchaseHandler';
import { DiscardRemnantHandler } from '../modules/inventory/domain/handlers/DiscardRemnantHandler';
import { CreateWorkHandler } from '../modules/works/domain/handlers/CreateWorkHandler';
import { ReverseWorkHandler } from '../modules/works/domain/handlers/ReverseWorkHandler';

/**
 * Registers all domain change handlers into the central changeHandlerRegistry.
 * This should be called during application bootstrapping and test setup,
 * keeping HTTP route definitions pure and free of side-effect imports.
 */
export function registerChangeHandlers(): void {
  changeHandlerRegistry.register(new CreateItemHandler());
  changeHandlerRegistry.register(new PurchaseHandler());
  changeHandlerRegistry.register(new DiscardRemnantHandler());
  changeHandlerRegistry.register(new CreateWorkHandler());
  changeHandlerRegistry.register(new ReverseWorkHandler());
}
