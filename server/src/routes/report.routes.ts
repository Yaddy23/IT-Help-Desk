import { Router } from 'express'
import {
  ticketsOverTime,
  byCategory,
  byPriority,
  resolutionTimes,
  topProblemAssets,
  warrantyExpiring,
  reportSummary,
} from '../controllers/report.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('admin', 'it_staff'))

router.get('/tickets-over-time', ticketsOverTime)
router.get('/by-category', byCategory)
router.get('/by-priority', byPriority)
router.get('/resolution-times', resolutionTimes)
router.get('/top-problem-assets', topProblemAssets)
router.get('/warranty-expiring', warrantyExpiring)
router.get('/summary', reportSummary)

export default router
