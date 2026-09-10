import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const schema = z.object({
  codigo: z.string().min(1),
  proveedor: z.string().min(1),
  costo_unitario: z.number().nonnegative(),
  fecha_vigencia: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return new Response(JSON.stringify({ error: 'Formato inválido', details: parse.error.flatten() }), { status: 400 })
  }
  const { codigo, proveedor, costo_unitario, fecha_vigencia } = parse.data
  await db.cotizaciones_historico.updateMany({
    where: { codigo_componente: codigo, proveedor, vigente: true },
    data: { vigente: false },
  })
  await db.cotizaciones_historico.create({
    data: {
      codigo_componente: codigo,
      proveedor,
      costo_unitario,
      vigente: true,
      fecha_actualizacion: fecha_vigencia ? new Date(fecha_vigencia) : new Date(),
    },
  })
  return new Response(JSON.stringify({ updated: true }), { status: 200 })
}

