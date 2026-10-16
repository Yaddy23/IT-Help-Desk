import { Router } from 'express'
import { changePassword, forgotPassword, login, logout, me, resetPassword } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.post('/logout', logout)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', requireAuth, me)
router.post('/change-password', requireAuth, changePassword)

export default router