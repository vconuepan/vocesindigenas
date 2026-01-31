export interface PaginationResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function paginate<T>(options: {
  findMany: () => Promise<T[]>
  count: () => Promise<number>
  page: number
  pageSize: number
}): Promise<PaginationResult<T>> {
  const [data, total] = await Promise.all([options.findMany(), options.count()])
  return {
    data,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.ceil(total / options.pageSize),
  }
}
