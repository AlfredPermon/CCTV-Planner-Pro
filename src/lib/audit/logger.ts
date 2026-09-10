import { db } from '@/lib/db'

type Payload = Record<string, unknown>

export async function logAudit(input: {
  module: string
  action: string
  user: string
  status: 'SUCCESS' | 'ERROR'
  payload: Payload
}) {
  try {
    await db.audit_log.create({
      data: {
        module: input.module,
        action: input.action,
        user: input.user,
        status: input.status,
        payload: input.payload as any,
      },
    })
  } catch {}
}
