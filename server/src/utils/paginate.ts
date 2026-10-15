import type { Model } from 'mongoose'

export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paginate<T extends Model<any>>(
  model: T,
  filter: Record<string, unknown>,
  { page, limit, skip }: ReturnType<typeof parsePagination>,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
  populate?: string | string[],
) {
  const [items, total] = await Promise.all([
    (populate ? model.find(filter).populate(populate) : model.find(filter))
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    model.countDocuments(filter),
  ])

  const meta: PageMeta = { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
  return { items, meta }
}
