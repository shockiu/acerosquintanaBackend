import { Category } from '../../../../models/Category';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class UpdateCategoryHandler implements IChangeHandler {
  entity = 'category';
  action = 'update';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;
    const categoryId = request.targetId;

    if (!categoryId) {
      throw new Error('targetId is required to update a category');
    }

    const category = await Category.findById(categoryId).session(tx);
    if (!category) {
      throw new Error('Category not found');
    }

    if (payload.name) {
      const existing = await Category.findOne({ name: payload.name, _id: { $ne: categoryId } }).session(tx);
      if (existing) {
        throw new Error('Category name already exists');
      }
      category.name = payload.name;
    }

    if (payload.description !== undefined) {
      category.description = payload.description;
    }

    if (payload.isActive !== undefined) {
      category.isActive = payload.isActive;
    }

    await category.save({ session: tx });
    return category;
  }
}

changeHandlerRegistry.register(new UpdateCategoryHandler());
