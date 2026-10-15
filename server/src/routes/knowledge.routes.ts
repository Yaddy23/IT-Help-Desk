import { Router } from 'express'
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  voteArticle,
  kbCategories,
} from '../controllers/knowledge.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listArticles)
router.get('/categories', kbCategories)
router.get('/:id', getArticle)
router.post('/', createArticle)
router.patch('/:id', updateArticle)
router.delete('/:id', deleteArticle)
router.post('/:id/vote', voteArticle)

export default router
