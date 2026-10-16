import { Router } from 'express'
import { changePassword, forgotPassword, login, logout, me, refresh, resetPassword } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', requireAuth, me)
router.post('/change-password', requireAuth, changePassword)
router.get('/refresh', (req, res) => res.status(405).json({ message: 'Method Not Allowed: Use POST instead' }))

export default router
