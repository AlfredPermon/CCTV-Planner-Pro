import { NextResponse } from 'next/server'
import { computeCoveragePercent } from '@/lib/cctv/geometry'
import { classifyIntent, hasDeviceTerm } from '@/lib/botip/intent'
import { CCTV_DOME_CAMERA, formatDeviceFeatures } from '@/lib/botip/knowledge'
import { chat, getConfig, ensureModelAvailable, ping, models } from '@/lib/ollama/client'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message: string = body.message ?? ''
    const cameras = body.context?.cameras ?? []
    const floorPlan = body.context?.floorPlan ?? null
    const intent = classifyIntent(message)

    logger.info('[Assistant] Nueva solicitud', { intent, messageLength: message.length, camerasCount: cameras.length })

    let response = ''

    // Manejo de intents específicos con conocimiento embebido
    if (intent === 'caracteristicas' && (hasDeviceTerm(message, 'domo') || hasDeviceTerm(message, 'cámara domo'))) {
      logger.info('[Assistant] Respondiendo con conocimiento embebido: características de domo')
      response = formatDeviceFeatures(CCTV_DOME_CAMERA)
    } else if (intent === 'definicion' && (hasDeviceTerm(message, 'domo') || hasDeviceTerm(message, 'cámara domo'))) {
      logger.info('[Assistant] Respondiendo con conocimiento embebido: definición de domo')
      response = CCTV_DOME_CAMERA.definition
    } else if (intent === 'dimensionamiento' || intent === 'proyecto') {
      logger.info('[Assistant] Realizando dimensionamiento del proyecto')
      const bandwidth = cameras.reduce((acc: number, c: any) => acc + (c.bitrate ?? 0), 0)
      const storagePerDay = cameras.reduce((acc: number, c: any) => acc + ((c.bitrate ?? 0) * 3600 * 24) / 8, 0)
      const coverage = computeCoveragePercent(cameras, floorPlan)
      const recNet = bandwidth > 1000 ? '10 Gigabit Ethernet' : 'Gigabit Ethernet'
      const storageGBDay = (storagePerDay / 1024).toFixed(1)
      const summary =
        `Diseño con ${cameras.length} cámaras.\n` +
        `Cobertura aprox.: ${coverage}% del plano.\n` +
        `Ancho de banda estimado: ${bandwidth.toFixed(1)} Mbps → Red: ${recNet}.\n` +
        `Almacenamiento diario: ${storageGBDay} GB.\n` +
        (floorPlan ? `Plano: ${floorPlan.name} (${floorPlan.width}x${floorPlan.height}).` : 'Sin plano cargado.')
      response = summary + '\nSugerencia: valide ubicaciones y evite puntos ciegos.'
    } else {
      // Para cualquier otro tipo de pregunta, intentar conectar con Ollama
      logger.info('[Assistant] Intentando conectar con Ollama para pregunta general', { intent })
      
      const cfg = getConfig()
      const healthCheck = await ensureModelAvailable()
      
      logger.info('[Assistant] Estado de salud de Ollama', healthCheck)
      
      if (healthCheck.ok && healthCheck.available) {
        // Ollama está disponible y el modelo está presente
        logger.info('[Assistant] Ollama disponible, enviando petición al modelo', { model: cfg.model })
        try {
          const r = await chat([
            { role: 'system', content: 'Responde de forma técnica, precisa y concisa en español para sistemas de baja tensión (CCTV, control de acceso, detección de incendios y voceo IP). Evita cálculos y datos de proyecto salvo que se soliciten.' },
            { role: 'user', content: message },
          ], cfg.model)
          
          if (r.ok && r.text) {
            response = r.text
            logger.info('[Assistant] Respuesta exitosa de Ollama', { responseLength: response.length })
          } else {
            logger.warn('[Assistant] Ollama respondió pero sin contenido válido')
            response = 'No pude generar una respuesta válida. Por favor, reformula tu pregunta.'
          }
        } catch (chatError: any) {
          logger.error('[Assistant] Error durante la petición a Ollama', { error: chatError?.message })
          response = `Error al procesar tu pregunta con IA: ${chatError?.message || 'Error desconocido'}. Por favor, intenta nuevamente.`
        }
      } else if (!healthCheck.ok) {
        // Ollama no es alcanzable
        logger.error('[Assistant] Ollama no es alcanzable', { error: 'server_unreachable' })
        response = '⚠️ **Ollama no está disponible**: El servidor local de Ollama no responde. Por favor:\n\n1. Verifica que Ollama esté instalado y ejecutándose en tu computadora\n2. Ejecuta `ollama serve` en una terminal\n3. Asegúrate de tener el modelo configurado descargado (ej: `ollama pull deepseek-r1:1.5b`)\n\nMientras tanto, puedo ayudarte con definiciones, características, comparaciones o dimensionamiento de proyectos CCTV.'
      } else if (!healthCheck.available) {
        // Ollama está corriendo pero el modelo no está disponible
        logger.warn('[Assistant] Modelo no disponible en Ollama', { model: cfg.model, availableModels: healthCheck.models })
        const availableModelsList = healthCheck.models?.length > 0 
          ? `\n\nModelos disponibles: ${healthCheck.models.join(', ')}`
          : '\n\nNo hay modelos descargados.'
        
        response = `⚠️ **Modelo no disponible**: El modelo "${cfg.model}" no está descargado en tu Ollama local.${availableModelsList}\n\nPara solucionarlo:\n1. Abre una terminal\n2. Ejecuta: \`ollama pull ${cfg.model}\`\n3. Espera a que termine la descarga\n\nMientras tanto, puedo ayudarte con información específica sobre dispositivos CCTV usando mis conocimientos embebidos.`
      } else {
        // Caso fallback por seguridad
        logger.warn('[Assistant] Caso fallback inesperado')
        response = 'Indique si busca definición, características, comparación o aplicación de dispositivos CCTV, o pida dimensionamiento del proyecto. También puede preguntar directamente sobre temas técnicos de baja tensión.'
      }
    }
    
    return NextResponse.json({ response, success: true })
  } catch (error: any) {
    logger.error('[Assistant] Error crítico procesando solicitud', { error: error?.message, stack: error?.stack })
    return NextResponse.json({ 
      response: '❌ Error procesando la solicitud. Por favor, verifica tu conexión e intenta nuevamente.',
      success: false,
      error: error?.message 
    }, { status: 400 })
  }
}
