import { NextRequest } from 'next/server'
import { parseExcel } from '@/lib/xls/validator'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: 'Archivo requerido' }), { status: 400 })
  }
  
  // Validar extensión/tipo básico
  const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  const isExcel = validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  
  if (!isExcel) {
    return new Response(JSON.stringify({ error: 'Formato inválido. Se requiere .xlsx o .xls' }), { status: 400 })
  }

  const buf = await file.arrayBuffer()
  let rows: Awaited<ReturnType<typeof parseExcel>>
  try {
    rows = await parseExcel(buf)
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error al leer Excel', details: String(e) }), { status: 400 })
  }
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'Sin filas válidas' }), { status: 400 })
  }

  for (const r of rows) {
    await db.cat_componentes.upsert({
      where: { codigo_componente: r.codigo },
      update: {
        descripcion: r.descripcion,
        unidad_medida: r.unidad,
        categoria: r.categoria,
        sistema: r.sistema,
      },
      create: {
        codigo_componente: r.codigo,
        descripcion: r.descripcion,
        unidad_medida: r.unidad,
        categoria: r.categoria,
        sistema: r.sistema,
      },
    })
    await db.cotizaciones_historico.updateMany({
      where: { codigo_componente: r.codigo, proveedor: r.proveedor, vigente: true },
      data: { vigente: false },
    })
    await db.cotizaciones_historico.create({
      data: {
        codigo_componente: r.codigo,
        costo_unitario: r.precio_unitario, // Mapeado desde el validador
        proveedor: r.proveedor,
        vigente: true,
        fecha_actualizacion: r.fecha_vigencia,
      },
    })
  }

  return new Response(JSON.stringify({ inserted: rows.length }), { status: 200 })
}

