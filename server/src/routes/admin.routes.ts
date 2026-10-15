import { Router } from 'express'
import {
  listDirectory,
  createUser,
  updateUser,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/admin.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Directory is readable by everyone; management is admin-only.
router.get('/users', listDirectory)
router.get('/departments', listDepartments)
router.post('/users', requireRole('admin'), createUser)
router.patch('/users/:id', updateUser)
router.post('/departments', requireRole('admin'), createDepartment)
router.patch('/departments/:id', requireRole('admin'), updateDepartment)
router.delete('/departments/:id', requireRole('admin'), deleteDepartment)

export default router
