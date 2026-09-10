import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sistema = searchParams.get('sistema') ?? undefined
  const categoria = searchParams.get('categoria') ?? undefined
  const proveedor = searchParams.get('proveedor') ?? undefined
  const desde = searchParams.get('desde') ?? undefined
  const hasta = searchParams.get('hasta') ?? undefined

  const comps = await db.cat_componentes.findMany({
    where: {
      sistema: sistema ?? undefined,
      categoria: categoria ?? undefined,
    },
    include: {
      cotizaciones: {
        where: {
          proveedor: proveedor ?? undefined,
          fecha_actualizacion: {
            gte: desde ? new Date(desde) : undefined,
            lte: hasta ? new Date(hasta) : undefined,
          },
        },
        orderBy: { fecha_actualizacion: 'desc' },
        take: 1,
      },
    },
  })
  return new Response(JSON.stringify(comps), { status: 200 })
}

