import { Router } from 'express'
import { listAuditLogs, auditActions } from '../controllers/audit.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireRole('admin'))

router.get('/', listAuditLogs)
router.get('/actions', auditActions)

export default router
