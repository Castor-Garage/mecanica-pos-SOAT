export interface PaginationParams {
  page?: number
  perPage?: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}

export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<never>['meta'] {
  return {
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

export function normalizePagination(params: PaginationParams): {
  page: number
  perPage: number
  skip: number
  take: number
} {
  const page = Math.max(1, params.page ?? 1)
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20))
  return { page, perPage, skip: (page - 1) * perPage, take: perPage }
}
