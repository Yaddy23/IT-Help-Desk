import { Router } from 'express'
import {
  addMaintenance,
  assignAsset,
  assetStats,
  createAsset,
  deleteAsset,
  getAsset,
  listAssets,
  returnAsset,
  updateAsset,
} from '../controllers/asset.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/', listAssets)
router.get('/stats', assetStats)
router.get('/:id', getAsset)
router.post('/', createAsset)
router.patch('/:id', updateAsset)
router.delete('/:id', deleteAsset)
router.post('/:id/assign', assignAsset)
router.post('/:id/return', returnAsset)
router.post('/:id/maintenance', addMaintenance)

export default router
