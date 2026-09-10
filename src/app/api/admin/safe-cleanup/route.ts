import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { runSafeDatabaseCleanup, SafeCleanupError, toSafeCleanupDbClient } from '@/lib/admin/safeCleanup'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const report = await runSafeDatabaseCleanup(toSafeCleanupDbClient(db), {
      dryRun: Boolean(body?.dryRun),
    })

    return Response.json(report, { status: 200 })
  } catch (error) {
    if (error instanceof SafeCleanupError) {
      return Response.json(
        {
          error: error.message,
          phase: error.phase,
          validation: error.validation,
        },
        { status: 409 }
      )
    }

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo ejecutar la limpieza segura.',
      },
      { status: 500 }
    )
  }
}
