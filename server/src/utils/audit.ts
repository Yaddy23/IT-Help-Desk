import type { Request } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import { AuditLog } from '../models/index.js'

interface AuditInput {
  req: Request & Partial<Pick<AuthRequest, 'user'>>
  action: string
  targetType: string
  targetId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

/**
 * Fire-and-forget audit trail entry. Logging must never break the request,
 * so everything is swallowed after a console note.
 */
export function audit(input: AuditInput): void {
  void AuditLog.create({
    actor: input.req.user?._id ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.req.ip,
  }).catch((err: unknown) => console.error('Audit write failed:', (err as Error).message))
}
