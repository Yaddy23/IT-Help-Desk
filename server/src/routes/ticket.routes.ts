import { Router } from 'express'
import {
  addComment,
  createTicket,
  downloadAttachment,
  getTicket,
  listTickets,
  reopenTicket,
  ticketStats,
  updateTicket,
  uploadAttachments,
} from '../controllers/ticket.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../config/upload.js'

const router = Router()

router.use(requireAuth)

router.get('/', listTickets)
router.get('/stats', ticketStats)
router.get('/:id', getTicket)
router.post('/', createTicket)
router.patch('/:id', updateTicket)
router.post('/:id/comments', addComment)
router.post('/:id/attachments', upload.array('files', 5), uploadAttachments)
router.get('/:id/attachments/:filename', downloadAttachment)
router.post('/:id/reopen', reopenTicket)

export default router
