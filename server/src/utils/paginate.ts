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
  {
    page,
    limit,
    skip,
  }: ReturnType<typeof parsePagination>,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
  populate?: string | { path: string; select?: string } | (string | { path: string; select?: string })[],
) {
  let query = model.find(filter)
  if (populate) {
    const populateArray = Array.isArray(populate) ? populate : [populate]
    for (const pop of populateArray) {
      if (typeof pop === 'string') {
        query = query.populate(pop)
      } else {
        query = query.populate({ path: pop.path, select: pop.select })
      }
    }
  }
  const [items, total] = await Promise.all([
    query.sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(filter),
  ])

  const meta: PageMeta = { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
  return { items, meta }
}