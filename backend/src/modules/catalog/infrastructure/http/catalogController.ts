import { Request, Response, NextFunction } from 'express';
import { CatalogUseCases } from '../../application/useCases/CatalogUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';

export class CatalogController {
  // Units
  static async listUnits(req: Request, res: Response, next: NextFunction) {
    try {
      const units = await CatalogUseCases.listUnits();
      res.json(success(units));
    } catch (error) {
      next(error);
    }
  }

  // Categories
  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CatalogUseCases.listCategories();
      res.json(success(categories));
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await CatalogUseCases.createCategory(req.body);
      res.status(201).json(success(cat));
    } catch (error: any) {
      if (error.message === 'Category name already exists') return res.status(409).json(fail(error.message));
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await CatalogUseCases.updateCategory(req.params.id as string, req.body);
      res.json(success(cat));
    } catch (error: any) {
      if (error.message === 'Category name already exists') return res.status(409).json(fail(error.message));
      if (error.message === 'Category not found') return res.status(404).json(fail(error.message));
      next(error);
    }
  }

  // Subcategories
  static async listSubcategories(req: Request, res: Response, next: NextFunction) {
    try {
      const subcategories = await CatalogUseCases.listSubcategories(req.query.categoryId as string);
      res.json(success(subcategories));
    } catch (error) {
      next(error);
    }
  }

  static async createSubcategory(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = await CatalogUseCases.createSubcategory(req.body);
      res.status(201).json(success(sub));
    } catch (error: any) {
      if (error.message.includes('already exists')) return res.status(409).json(fail(error.message));
      next(error);
    }
  }

  static async updateSubcategory(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = await CatalogUseCases.updateSubcategory(req.params.id as string, req.body);
      res.json(success(sub));
    } catch (error: any) {
      if (error.message.includes('already exists')) return res.status(409).json(fail(error.message));
      if (error.message === 'Subcategory not found') return res.status(404).json(fail(error.message));
      next(error);
    }
  }
}
