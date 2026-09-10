import { COMPONENT_CODES, getCodeCategory } from '@/lib/costs/component_codes'

export async function GET() {
  const headers = ['codigo', 'descripcion', 'unidad', 'cantidad', 'precio_unitario', 'importe', 'proveedor', 'fecha_vigencia', 'sistema', 'categoria']
  
  // Generar filas de ejemplo con los códigos requeridos
  const exampleRows: string[] = []
  
  // Helper para fecha actual YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0]

  // Recorrer sistemas y códigos
  Object.entries(COMPONENT_CODES).forEach(([sistema, codes]) => {
    codes.forEach(code => {
      const { categoria } = getCodeCategory(code)
      // Ejemplo genérico
      exampleRows.push([
        code,                               // codigo
        `Descripción genérica para ${code}`, // descripcion
        'und',                              // unidad
        '1',                                // cantidad
        '0.00',                             // precio_unitario
        '0.00',                             // importe
        'Proveedor Generico',               // proveedor
        today,                              // fecha_vigencia
        sistema,                            // sistema
        categoria                           // categoria
      ].join(','))
    })
  })

  const csv = [headers.join(','), ...exampleRows].join('\n')
  
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla_cotizaciones_estandarizada.csv"',
    },
  })
}

