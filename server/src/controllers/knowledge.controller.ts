import type { Request, Response } from 'express'
import { KnowledgeBase } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginate, parsePagination } from '../utils/paginate.js'

const STAFF_ROLES = new Set(['admin', 'it_staff'])

export const listArticles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = req.query as Record<string, string | undefined>
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)

  const filter: Record<string, unknown> = {}
  // Drafts are only visible to staff.
  if (!STAFF_ROLES.has(req.user!.role)) filter.isPublished = true
  else if (q.published === 'true') filter.isPublished = true

  if (q.category) filter.category = q.category
  if (q.tag) filter.tags = q.tag
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ title: rx }, { content: rx }, { tags: rx }]
  }

  const { items, meta } = await paginate(
    KnowledgeBase,
    filter,
    { page, limit, skip },
    { viewCount: -1, createdAt: -1 },
    'author',
  )
  res.json({ articles: items, meta })
})

export const getArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await KnowledgeBase.findById(req.params.id).populate('author', 'name role')
  if (!article) throw new ApiError(404, 'Article not found')

  if (!article.isPublished && !STAFF_ROLES.has(req.user!.role)) {
    throw new ApiError(404, 'Article not found')
  }

  // Fire-and-forget view counter.
  void KnowledgeBase.updateOne({ _id: article._id }, { $inc: { viewCount: 1 } }).exec()

  res.json(article)
})

export const createArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const { title, content, category, tags, isPublished } = req.body as {
    title?: string
    content?: string
    category?: string
    tags?: string[]
    isPublished?: boolean
  }
  if (!title?.trim() || !content?.trim()) throw new ApiError(400, 'Title and content are required')

  const article = await KnowledgeBase.create({
    title: title.trim(),
    content,
    category: category || 'general',
    tags: tags ?? [],
    isPublished: isPublished ?? true,
    author: req.user!._id,
  })
  res.status(201).json(article)
})

export const updateArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const article = await KnowledgeBase.findById(req.params.id)
  if (!article) throw new ApiError(404, 'Article not found')

  const body = req.body as Record<string, unknown>
  for (const key of ['title', 'content', 'category', 'tags', 'isPublished'] as const) {
    if (body[key] !== undefined) {
      Object.assign(article, { [key]: body[key] })
    }
  }
  await article.save()
  res.json(article)
})

export const deleteArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can delete articles')

  const article = await KnowledgeBase.findById(req.params.id)
  if (!article) throw new ApiError(404, 'Article not found')
  await article.deleteOne()
  res.json({ message: 'Article deleted' })
})

export const voteArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await KnowledgeBase.findById(req.params.id)
  if (!article) throw new ApiError(404, 'Article not found')

  const { helpful } = req.body as { helpful?: boolean }
  if (helpful) article.helpfulYes += 1
  else article.helpfulNo += 1
  await article.save()
  res.json({ helpfulYes: article.helpfulYes, helpfulNo: article.helpfulNo })
})

export const kbCategories = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await KnowledgeBase.distinct('category')
  res.json(rows)
})
