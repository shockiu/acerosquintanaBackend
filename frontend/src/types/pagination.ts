import { z } from 'zod';

export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export interface PaginatedResult<T> {
  items?: T[];
  works?: T[];
  requests?: T[];
  categories?: T[];
  subcategories?: T[];
  logs?: T[];
  pagination: PaginationMeta;
}
