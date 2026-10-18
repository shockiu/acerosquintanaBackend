import { Subcategory } from '../../../../models/Subcategory';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class UpdateSubcategoryHandler implements IChangeHandler {
  entity = 'subcategory';
  action = 'update';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;
    const subcategoryId = request.targetId;

    if (!subcategoryId) {
      throw new Error('targetId is required to update a subcategory');
    }

    const subcategory = await Subcategory.findById(subcategoryId).session(tx);
    if (!subcategory) {
      throw new Error('Subcategory not found');
    }

    const targetCategory = payload.category !== undefined ? payload.category : subcategory.category;

    if (payload.name) {
      const existing = await Subcategory.findOne({
        category: targetCategory,
        name: payload.name,
        _id: { $ne: subcategoryId },
      }).session(tx);
      if (existing) {
        throw new Error('Subcategory name already exists in this category');
      }
      subcategory.name = payload.name;
    }

    if (payload.category !== undefined) {
      subcategory.category = payload.category;
    }

    if (payload.unit !== undefined) {
      subcategory.unit = payload.unit;
    }

    if (payload.kind !== undefined) {
      subcategory.kind = payload.kind;
    }

    if (payload.imageUrl !== undefined) {
      subcategory.imageUrl = payload.imageUrl;
    }

    if (payload.isActive !== undefined) {
      subcategory.isActive = payload.isActive;
    }

    await subcategory.save({ session: tx });
    return subcategory.populate(['category', 'unit']);
  }
}

changeHandlerRegistry.register(new UpdateSubcategoryHandler());
