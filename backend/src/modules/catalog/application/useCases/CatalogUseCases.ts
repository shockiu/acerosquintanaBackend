import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { Unit } from '../../../../models/Unit';

export class CatalogUseCases {
  // Units (Read Only)
  static async listUnits() {
    return Unit.find().sort({ name: 1 });
  }

  // Categories
  static async listCategories() {
    return Category.find().sort({ name: 1 });
  }

  static async createCategory(data: any) {
    const existing = await Category.findOne({ name: data.name });
    if (existing) {
      throw new Error('Category name already exists');
    }
    return Category.create(data);
  }

  static async updateCategory(id: string, data: any) {
    if (data.name) {
      const existing = await Category.findOne({ name: data.name, _id: { $ne: id } });
      if (existing) throw new Error('Category name already exists');
    }
    const cat = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!cat) throw new Error('Category not found');
    return cat;
  }

  // Subcategories
  static async listSubcategories(categoryId?: string) {
    const query = categoryId ? { category: categoryId } : {};
    return Subcategory.find(query).populate('category').populate('unit').sort({ name: 1 });
  }

  static async createSubcategory(data: any) {
    const existing = await Subcategory.findOne({ category: data.category, name: data.name });
    if (existing) {
      throw new Error('Subcategory name already exists in this category');
    }
    const sub = await Subcategory.create(data);
    return sub.populate(['category', 'unit']);
  }

  static async updateSubcategory(id: string, data: any) {
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
