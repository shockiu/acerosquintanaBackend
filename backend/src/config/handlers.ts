import { changeHandlerRegistry } from '../modules/approvals/domain/ChangeHandlerRegistry';
import { CreateItemHandler } from '../modules/inventory/domain/handlers/CreateItemHandler';
import { UpdateItemHandler } from '../modules/inventory/domain/handlers/UpdateItemHandler';
import { PurchaseHandler } from '../modules/inventory/domain/handlers/PurchaseHandler';
import { DiscardRemnantHandler } from '../modules/inventory/domain/handlers/DiscardRemnantHandler';
import { CreateWorkHandler } from '../modules/works/domain/handlers/CreateWorkHandler';
import { ReverseWorkHandler } from '../modules/works/domain/handlers/ReverseWorkHandler';
import { UpdateCategoryHandler } from '../modules/catalog/domain/handlers/UpdateCategoryHandler';
import { UpdateSubcategoryHandler } from '../modules/catalog/domain/handlers/UpdateSubcategoryHandler';
import { CreateSaleApprovalHandler } from '../modules/sales/domain/handlers/CreateSaleApprovalHandler';
import { CancelSaleApprovalHandler } from '../modules/sales/domain/handlers/CancelSaleApprovalHandler';

/**
 * Registers all domain change handlers into the central changeHandlerRegistry.
 * This should be called during application bootstrapping and test setup,
 * keeping HTTP route definitions pure and free of side-effect imports.
 */
export function registerChangeHandlers(): void {
  changeHandlerRegistry.register(new CreateItemHandler());
  changeHandlerRegistry.register(new UpdateItemHandler());
  changeHandlerRegistry.register(new PurchaseHandler());
  changeHandlerRegistry.register(new DiscardRemnantHandler());
  changeHandlerRegistry.register(new CreateWorkHandler());
  changeHandlerRegistry.register(new ReverseWorkHandler());
  changeHandlerRegistry.register(new UpdateCategoryHandler());
  changeHandlerRegistry.register(new UpdateSubcategoryHandler());
  changeHandlerRegistry.register(new CreateSaleApprovalHandler());
  changeHandlerRegistry.register(new CancelSaleApprovalHandler());
}


