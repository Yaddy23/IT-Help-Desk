import { Router } from 'express'
import { getUser, listUsers } from '../controllers/user.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', listUsers)
router.get('/:id', getUser)

export default router
