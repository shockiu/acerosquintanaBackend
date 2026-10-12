import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { Unit } from '../../../../models/Unit';
import { ApprovalUseCases } from '../../../approvals/application/useCases/ApprovalUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';

export class CatalogUseCases {
  // Units (Read Only)
  static async listUnits() {
    return Unit.find().sort({ name: 1 });
  }

  // Categories
  static async listCategories(filters?: any, page?: number, limit?: number) {
    const query: any = {};
    if (filters?.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    let catQuery = Category.find(query).sort({ name: 1 });
    let total = 0;

    if (page && limit) {
      const skip = (page - 1) * limit;
      total = await Category.countDocuments(query);
      catQuery = catQuery.skip(skip).limit(limit) as any;
    }

    const categories = await catQuery;

    if (page && limit) {
      return {
        categories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    return categories;
  }

  static async createCategory(data: any) {
    const existing = await Category.findOne({ name: data.name });
    if (existing) {
      throw new Error('Category name already exists');
    }
    return Category.create(data);
  }

  static async executeOrRequest(entity: string, action: string, payload: any, ctx: ActionContext, targetId?: string) {
    if (ctx.role === 'user') {
      return ApprovalUseCases.submitRequest({ entity, action, targetId, payload }, ctx);
    } else {
      const requestData = {
        entity,
        action,
        targetId,
        payload,
        status: 'approved',
        requestedBy: ctx.actorId,
        reviewedBy: ctx.actorId,
        reviewedAt: new Date(),
      };
      return uow.runInTransaction(async (tx) => {
        const handler = changeHandlerRegistry.get(entity, action);
        const result = await handler.apply(requestData as any, {}, ctx, tx);

        const { auditLogger } = await import('../../../audit/infrastructure/persistence/AuditLogger');
        await auditLogger.log({
          actor: ctx.actorId,
          action: `${entity}.${action}.direct`,
          entity,
          entityId: result._id?.toString() || targetId,
          after: result,
          ip: ctx.ip,
        }, tx);

        return result;
      });
    }
  }

  static async updateCategory(id: string, data: any, ctx?: ActionContext) {
    if (ctx) {
      return this.executeOrRequest('category', 'update', data, ctx, id);
    }
    if (data.name) {
      const existing = await Category.findOne({ name: data.name, _id: { $ne: id } });
      if (existing) throw new Error('Category name already exists');
    }
    const cat = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!cat) throw new Error('Category not found');
    return cat;
  }

  // Subcategories
  static async listSubcategories(categoryId?: string, page?: number, limit?: number) {
    const query = categoryId ? { category: categoryId } : {};
    let subQuery = Subcategory.find(query).populate('category').populate('unit').sort({ name: 1 });
    let total = 0;

    if (page && limit) {
      const skip = (page - 1) * limit;
      total = await Subcategory.countDocuments(query);
      subQuery = subQuery.skip(skip).limit(limit) as any;
    }

    const subcategories = await subQuery;

    if (page && limit) {
      return {
        subcategories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    return subcategories;
  }


  static async createSubcategory(data: any) {
    const existing = await Subcategory.findOne({ category: data.category, name: data.name });
    if (existing) {
      throw new Error('Subcategory name already exists in this category');
    }
    const sub = await Subcategory.create(data);
    return sub.populate(['category', 'unit']);
  }

  static async updateSubcategory(id: string, data: any, ctx?: ActionContext) {
    if (ctx) {
      return this.executeOrRequest('subcategory', 'update', data, ctx, id);
    }
    const existingSub = await Subcategory.findById(id);
    if (!existingSub) throw new Error('Subcategory not found');

    if (data.name) {
      const existing = await Subcategory.findOne({ 
        category: existingSub.category, 
        name: data.name, 
        _id: { $ne: id } 
      });
      if (existing) throw new Error('Subcategory name already exists in this category');
    }
    
    const sub = await Subcategory.findByIdAndUpdate(id, data, { new: true }).populate(['category', 'unit']);
    return sub;
  }
}

