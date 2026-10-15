import crypto from 'crypto'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { env } from './env.js'

const UPLOAD_DIR = path.join(env.uploadDir ?? 'uploads')

const ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: MAX_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) return cb(null, true)
    cb(new Error(`File type not allowed: ${file.mimetype}`))
  },
})
