import type { Prisma } from '@prisma/client'

export const PROTECTED_DATABASE_CATALOG_SYSTEMS = ['CCTV', 'ACCESO', 'VOCEO', 'INCENDIO'] as const
export const NON_DATABASE_PROTECTED_CATALOGS = ['PARKING'] as const
export const CLEANABLE_TABLES = ['detalle_calculos', 'proyectos_calculos', 'audit_log'] as const
export const EXCLUDED_TABLES = ['cat_componentes', 'cotizaciones_historico'] as const
const PROBE_LIMIT = 5

export type ProtectedDatabaseCatalogSystem = (typeof PROTECTED_DATABASE_CATALOG_SYSTEMS)[number]

type ComponentProbeRow = {
  codigo_componente: string
  cotizaciones: Array<{ id_cotizacion: string }>
}

type TableCounter = {
  count(args?: Record<string, unknown>): Promise<number>
}

type TableDeleter = TableCounter & {
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>
}

export interface SafeCleanupDbClient {
  cat_componentes: TableCounter & {
    findMany(args?: Record<string, unknown>): Promise<ComponentProbeRow[]>
  }
  cotizaciones_historico: TableCounter
  detalle_calculos: TableDeleter
  proyectos_calculos: TableDeleter
  audit_log: TableDeleter
  $transaction<T>(fn: (tx: SafeCleanupDbClient) => Promise<T>): Promise<T>
}

export function toSafeCleanupDbClient(client: any): SafeCleanupDbClient {
  const wrap = (c: any): SafeCleanupDbClient => ({
    cat_componentes: {
      async count(args?: Record<string, unknown>) {
        return await c.cat_componentes.count(args as any)
      },
      async findMany(args?: Record<string, unknown>) {
        return await c.cat_componentes.findMany(args as any)
      },
    },
    cotizaciones_historico: {
      async count(args?: Record<string, unknown>) {
        return await c.cotizaciones_historico.count(args as any)
      },
    },
    detalle_calculos: {
      async count(args?: Record<string, unknown>) {
        return await c.detalle_calculos.count(args as any)
      },
      async deleteMany(args?: Record<string, unknown>) {
        return await c.detalle_calculos.deleteMany(args as any)
      },
    },
    proyectos_calculos: {
      async count(args?: Record<string, unknown>) {
        return await c.proyectos_calculos.count(args as any)
      },
      async deleteMany(args?: Record<string, unknown>) {
        return await c.proyectos_calculos.deleteMany(args as any)
      },
    },
    audit_log: {
      async count(args?: Record<string, unknown>) {
        return await c.audit_log.count(args as any)
      },
      async deleteMany(args?: Record<string, unknown>) {
        return await c.audit_log.deleteMany(args as any)
      },
    },
    async $transaction<T>(fn: (tx: SafeCleanupDbClient) => Promise<T>) {
      return await c.$transaction((tx: any) => fn(wrap(tx)))
    },
  })

  return wrap(client)
}

export interface ProtectedCatalogMetrics {
  components: number
  quotes: number
  probeCodes: string[]
  accessibleCodes: string[]
  pricedProbeCodes: string[]
}

export interface CleanupSnapshot {
  createdAt: string
  scope: {
    protectedDatabaseCatalogs: readonly ProtectedDatabaseCatalogSystem[]
    nonDatabaseProtectedCatalogs: readonly string[]
    cleanableTables: readonly string[]
    excludedTables: readonly string[]
  }
  totals: {
    cat_componentes: number
    cotizaciones_historico: number
    detalle_calculos: number
    proyectos_calculos: number
    audit_log: number
  }
  protectedCatalogs: Record<ProtectedDatabaseCatalogSystem, ProtectedCatalogMetrics>
}

export interface CleanupValidationIssue {
  scope: string
  message: string
}

export interface CleanupValidationResult {
  ok: boolean
  issues: CleanupValidationIssue[]
}

export interface SafeCleanupOptions {
  dryRun?: boolean
}

export interface SafeCleanupResult {
  dryRun: boolean
  scope: CleanupSnapshot['scope']
  deleted: Record<(typeof CLEANABLE_TABLES)[number], number>
  pre: CleanupSnapshot
  post: CleanupSnapshot
  validation: CleanupValidationResult
}

export class SafeCleanupError extends Error {
  readonly phase: 'pre' | 'post'
  readonly validation: CleanupValidationResult

  constructor(phase: 'pre' | 'post', validation: CleanupValidationResult) {
    super(`La validación ${phase} de la limpieza segura falló.`)
    this.name = 'SafeCleanupError'
    this.phase = phase
    this.validation = validation
  }
}

function createScope() {
  return {
    protectedDatabaseCatalogs: PROTECTED_DATABASE_CATALOG_SYSTEMS,
    nonDatabaseProtectedCatalogs: NON_DATABASE_PROTECTED_CATALOGS,
    cleanableTables: CLEANABLE_TABLES,
    excludedTables: EXCLUDED_TABLES,
  }
}

function uniqueCodes(rows: Array<{ codigo_componente: string }>): string[] {
  return Array.from(new Set(rows.map((row) => row.codigo_componente)))
}

async function collectProtectedCatalogMetrics(
  db: SafeCleanupDbClient,
  sistema: ProtectedDatabaseCatalogSystem,
  preferredProbeCodes?: string[]
): Promise<ProtectedCatalogMetrics> {
  const [components, quotes] = await Promise.all([
    db.cat_componentes.count({ where: { sistema } }),
    db.cotizaciones_historico.count({ where: { componente: { sistema } } }),
  ])

  const probeTarget = preferredProbeCodes && preferredProbeCodes.length > 0
    ? preferredProbeCodes
    : undefined

  const probeRows = await db.cat_componentes.findMany({
    where: {
      sistema,
      codigo_componente: probeTarget ? { in: probeTarget } : undefined,
    },
    select: {
      codigo_componente: true,
      cotizaciones: {
        where: { vigente: true },
        orderBy: { fecha_actualizacion: 'desc' },
        take: 1,
        select: { id_cotizacion: true },
      },
    },
    orderBy: { codigo_componente: 'asc' },
    take: probeTarget ? undefined : PROBE_LIMIT,
  } satisfies Prisma.cat_componentesFindManyArgs)

  const accessibleCodes = uniqueCodes(probeRows)
  const pricedProbeCodes = uniqueCodes(probeRows.filter((row) => row.cotizaciones.length > 0))
  const probeCodes = probeTarget ? [...probeTarget] : accessibleCodes

  return {
    components,
    quotes,
    probeCodes,
    accessibleCodes,
    pricedProbeCodes,
  }
}

export async function collectCleanupSnapshot(
  db: SafeCleanupDbClient,
  preferredProbeCodes?: Partial<Record<ProtectedDatabaseCatalogSystem, string[]>>
): Promise<CleanupSnapshot> {
  const [catComponentes, cotizaciones, detalleCalculos, proyectosCalculos, auditLog, ...protectedCatalogsResults] =
    await Promise.all([
      db.cat_componentes.count(),
      db.cotizaciones_historico.count(),
      db.detalle_calculos.count(),
      db.proyectos_calculos.count(),
      db.audit_log.count(),
      ...PROTECTED_DATABASE_CATALOG_SYSTEMS.map((sistema) =>
        collectProtectedCatalogMetrics(db, sistema, preferredProbeCodes?.[sistema])
      ),
    ])

  const protectedCatalogs = PROTECTED_DATABASE_CATALOG_SYSTEMS.reduce((acc, sistema, index) => {
    acc[sistema] = protectedCatalogsResults[index]
    return acc
  }, {} as Record<ProtectedDatabaseCatalogSystem, ProtectedCatalogMetrics>)

  return {
    createdAt: new Date().toISOString(),
    scope: createScope(),
    totals: {
      cat_componentes: catComponentes,
      cotizaciones_historico: cotizaciones,
      detalle_calculos: detalleCalculos,
      proyectos_calculos: proyectosCalculos,
      audit_log: auditLog,
    },
    protectedCatalogs,
  }
}

export function validatePreCleanupSnapshot(snapshot: CleanupSnapshot): CleanupValidationResult {
  const issues: CleanupValidationIssue[] = []

  for (const sistema of PROTECTED_DATABASE_CATALOG_SYSTEMS) {
    const metrics = snapshot.protectedCatalogs[sistema]

    if (metrics.quotes > 0 && metrics.components === 0) {
      issues.push({
        scope: sistema,
        message: 'Existen cotizaciones protegidas sin componentes de catálogo asociados.',
      })
    }

    if (metrics.probeCodes.some((code) => !metrics.accessibleCodes.includes(code))) {
      issues.push({
        scope: sistema,
        message: 'No se pudieron consultar todos los códigos de muestra del catálogo protegido.',
      })
    }
  }

  return { ok: issues.length === 0, issues }
}

export function validatePostCleanupSnapshot(
  pre: CleanupSnapshot,
  post: CleanupSnapshot,
  options: { dryRun?: boolean } = {}
): CleanupValidationResult {
  const issues: CleanupValidationIssue[] = []
  const dryRun = options.dryRun ?? false

  for (const sistema of PROTECTED_DATABASE_CATALOG_SYSTEMS) {
    const before = pre.protectedCatalogs[sistema]
    const after = post.protectedCatalogs[sistema]

    if (before.components !== after.components) {
      issues.push({
        scope: sistema,
        message: `El conteo de componentes protegidos cambió de ${before.components} a ${after.components}.`,
      })
    }

    if (before.quotes !== after.quotes) {
      issues.push({
        scope: sistema,
        message: `El conteo de cotizaciones protegidas cambió de ${before.quotes} a ${after.quotes}.`,
      })
    }

    for (const code of before.probeCodes) {
      if (!after.accessibleCodes.includes(code)) {
        issues.push({
          scope: sistema,
          message: `El código protegido ${code} dejó de ser consultable después de la limpieza.`,
        })
      }
    }

    for (const code of before.pricedProbeCodes) {
      if (!after.pricedProbeCodes.includes(code)) {
        issues.push({
          scope: sistema,
          message: `El código protegido ${code} dejó de resolver una cotización vigente después de la limpieza.`,
        })
      }
    }
  }

  if (!dryRun && post.totals.detalle_calculos !== 0) {
    issues.push({
      scope: 'detalle_calculos',
      message: 'La tabla operativa detalle_calculos no quedó vacía después de la limpieza.',
    })
  }

  if (!dryRun && post.totals.proyectos_calculos !== 0) {
    issues.push({
      scope: 'proyectos_calculos',
      message: 'La tabla operativa proyectos_calculos no quedó vacía después de la limpieza.',
    })
  }

  if (!dryRun && post.totals.audit_log !== 0) {
    issues.push({
      scope: 'audit_log',
      message: 'La tabla operativa audit_log no quedó vacía después de la limpieza.',
    })
  }

  if (pre.totals.cat_componentes !== post.totals.cat_componentes) {
    issues.push({
      scope: 'cat_componentes',
      message: 'El total de componentes protegidos cambió y no debía modificarse.',
    })
  }

  if (pre.totals.cotizaciones_historico !== post.totals.cotizaciones_historico) {
    issues.push({
      scope: 'cotizaciones_historico',
      message: 'El total de cotizaciones protegidas cambió y no debía modificarse.',
    })
  }

  return { ok: issues.length === 0, issues }
}

function buildPreferredProbeCodes(snapshot: CleanupSnapshot) {
  return PROTECTED_DATABASE_CATALOG_SYSTEMS.reduce((acc, sistema) => {
    acc[sistema] = snapshot.protectedCatalogs[sistema].probeCodes
    return acc
  }, {} as Record<ProtectedDatabaseCatalogSystem, string[]>)
}

export async function runSafeDatabaseCleanup(
  db: SafeCleanupDbClient,
  options: SafeCleanupOptions = {}
): Promise<SafeCleanupResult> {
  const dryRun = options.dryRun ?? false
  const pre = await collectCleanupSnapshot(db)
  const preValidation = validatePreCleanupSnapshot(pre)

  if (!preValidation.ok) {
    throw new SafeCleanupError('pre', preValidation)
  }

  const deleted = await db.$transaction(async (tx) => {
    if (dryRun) {
      return {
        detalle_calculos: 0,
        proyectos_calculos: 0,
        audit_log: 0,
      }
    }

    const deletedDetalle = await tx.detalle_calculos.deleteMany()
    const deletedProyectos = await tx.proyectos_calculos.deleteMany()
    const deletedAudit = await tx.audit_log.deleteMany()

    return {
      detalle_calculos: deletedDetalle.count,
      proyectos_calculos: deletedProyectos.count,
      audit_log: deletedAudit.count,
    }
  })

  const post = await collectCleanupSnapshot(db, buildPreferredProbeCodes(pre))
  const validation = validatePostCleanupSnapshot(pre, post, { dryRun })

  if (!validation.ok) {
    throw new SafeCleanupError('post', validation)
  }

  return {
    dryRun,
    scope: pre.scope,
    deleted,
    pre,
    post,
    validation,
  }
}
