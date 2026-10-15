import { Router } from 'express'
import { listNotifications, unreadCount, markRead, markAllRead } from '../controllers/notification.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listNotifications)
router.get('/unread-count', unreadCount)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', markRead)

export default router
