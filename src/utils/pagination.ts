import { PaginationMeta } from './ApiResponse';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

/** Clamps page/limit into safe bounds and derives the Mongo skip offset. */
export function toPageParams(page?: number, limit?: number): PageParams {
  const safePage = Math.max(1, page ?? 1);
  const safeLimit = Math.min(100, Math.max(1, limit ?? 20));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildMeta(params: PageParams, totalItems: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
  return {
    page: params.page,
    limit: params.limit,
    totalItems,
    totalPages,
    hasNextPage: params.page < totalPages,
  };
}
