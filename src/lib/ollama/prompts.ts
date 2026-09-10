import { db } from '@/lib/db'

type CatalogRow = {
  codigo_componente: string
  descripcion: string | null
  sistema: string
  categoria: string
}

function renderCatalogTable(rows: CatalogRow[]) {
  const header = ['codigo', 'descripcion', 'sistema', 'categoria'].join(', ')
  const lines = rows.map((r) =>
    [
      r.codigo_componente,
      (r.descripcion || '').replace(/\n/g, ' ').trim(),
      r.sistema,
      r.categoria,
    ].join(', ')
  )
  return [header, ...lines].join('\n')
}

export async function buildCostAgentPrompt(): Promise<string> {
  const items = await db.cat_componentes.findMany({
    select: {
      codigo_componente: true,
      descripcion: true,
      sistema: true,
      categoria: true,
    },
    orderBy: [{ sistema: 'asc' }, { categoria: 'asc' }, { codigo_componente: 'asc' }],
  })
  const catalogMarkdown = renderCatalogTable(items)
  const prompt =
    [
      'Eres un experto cotizador de sistemas de seguridad (BOM Specialist).',
      'Tu trabajo es desglosar requerimientos en listas de materiales y ajustar parámetros técnicos usando únicamente los códigos provistos.',
      '',
      'Reglas:',
      '1) Usa solo productos existentes en el catálogo proporcionado.',
      '2) Parametriza con lógica estándar:',
      '- Incendio: 1 detector cada 50m2, 1 panel por edificio o hasta 32 detectores/panel.',
      '- CCTV: 1 cámara por acceso/punto, cable promedio 20m por cámara si no se indica, conectores x2 por cámara.',
      '- Acceso: 1 controladora por cada 2 puertas/lectores, 1 cerradura por puerta.',
      '- Voceo: distribución por zona, amplificador por cada 6 paneles/zonas.',
      '3) Accesorios: para cada dispositivo activo incluye su fuente si existe en catálogo.',
      '4) No inventes códigos. Si un requerimiento no existe en catálogo, omite o usa genérico existente.',
      '5) Manejo de incertidumbre: si faltan datos, asume estándar (altura 3m, cable 20m, etc.) e indícalo en razonamiento.',
      '6) Salida estricta en JSON, sin texto adicional.',
      '',
      'Catálogo disponible (CSV):',
      catalogMarkdown,
      '',
      'Formato de respuesta esperado:',
      '[',
      '  {"codigo":"CODIGO_DEL_CATALOGO","cantidad_estimada":10,"razonamiento":"Breve explicacion"}',
      ']',
      '',
      'También puedes devolver parámetros optimizados en un objeto con claves por subsistema si es necesario:',
      '{',
      '  "cctv":{"conteo":{"dispositivos":10},"params":{"distanciaPromedioCableadoMts":20,"factorRedundancia":1.0,"requisitosPotencia":{"fuentePorNDispositivos":8}}},',
      '  "acceso":{"conteo":{"dispositivos":2},"params":{"distanciaPromedioCableadoMts":30}},',
      '  "voceo":{"conteo":{"dispositivos":4},"params":{"distanciaPromedioCableadoMts":40}},',
      '  "incendio":{"conteo":{"dispositivos":8},"params":{"distanciaPromedioCableadoMts":25}},',
      '  "sugerencias_bom":[{"codigo":"CCTV_CABLE","cantidad_estimada":200,"razonamiento":"20m por cámara"}]',
      '}',
    ].join('\n')
  return prompt
}

export async function buildConsultantPrompt(currentContext?: any): Promise<string> {
  // Optimización: Solo inyectar items críticos (GENERAL) y un resumen de los demás
  const infrastructureItems = await db.cat_componentes.findMany({
    where: { categoria: { in: ['GENERAL', 'General', 'FUENTE', 'RACK', 'UPS'] } },
    select: { codigo_componente: true, descripcion: true, sistema: true, categoria: true },
    take: 50 // Limit infrastructure items
  })
  
  const infrastructureMarkdown = renderCatalogTable(infrastructureItems)

  const contextStr = currentContext ? JSON.stringify(currentContext, null, 2) : 'Sin datos previos'

  return `
Eres un Ingeniero Senior de Proyectos. Tu objetivo es realizar un levantamiento consultivo BREVE.

CATÁLOGO DE INFRAESTRUCTURA (Racks, UPS, Redes) DISPONIBLE:
${infrastructureMarkdown}
*Para cámaras, sensores y lectores, asume que existen y usa genéricos si no están en esta lista.*

TU MISIÓN:
1. Haz preguntas concisas (máximo 1 a la vez) para completar información faltante (Ubicación, Distancias, Marcas).
2. Si el usuario pide calcular, genera el JSON final.

FORMATO FINAL JSON (Solo al terminar):
\`\`\`json
{
  "status": "COMPLETED",
  "summary": "Resumen...",
  "optimization_metrics": { "improvement_pct": 10, "added_components_count": 0, "value_add_estimate": "Estimación" },
  "optimized_params": {
    "cctv": { "conteo": { "dispositivos": 0 }, "params": { "distanciaPromedioCableadoMts": 0 } }
  },
  "additional_recommendations": []
}
\`\`\`

CONTEXTO:
${contextStr}
`
}
