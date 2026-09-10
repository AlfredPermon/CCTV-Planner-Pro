import type { VoceoDeviceType } from './device'
import { resolveIconStyle, setupIconContext } from '@/lib/device/iconUtils'

export type VoceoIconState = 'normal' | 'hover' | 'selected' | 'disabled'

export interface VoceoColorDef {
  primary: string
  secondary: string
  accent: string
  stroke: string
  glow: string
}

export const VOCEO_COLORS: Record<string, VoceoColorDef> = {
  speaker_ceiling: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    accent: '#d97706',
    stroke: '#b45309',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  speaker_wall: {
    primary: '#ea580c',
    secondary: '#f97316',
    accent: '#c2410c',
    stroke: '#9a3412',
    glow: 'rgba(234, 88, 12, 0.4)'
  },
  horn: {
    primary: '#e11d48',
    secondary: '#fb7185',
    accent: '#be123c',
    stroke: '#881337',
    glow: 'rgba(225, 29, 72, 0.4)'
  },
  gateway: {
    primary: '#0284c7',
    secondary: '#38bdf8',
    accent: '#0369a1',
    stroke: '#075985',
    glow: 'rgba(2, 132, 199, 0.4)'
  },
  amplifier: {
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#5b21b6',
    stroke: '#4c1d95',
    glow: 'rgba(124, 58, 237, 0.4)'
  },
  microphone: {
    primary: '#059669',
    secondary: '#34d399',
    accent: '#047857',
    stroke: '#065f46',
    glow: 'rgba(5, 150, 105, 0.4)'
  },
  panel: {
    primary: '#4f46e5',
    secondary: '#818cf8',
    accent: '#3730a3',
    stroke: '#312e81',
    glow: 'rgba(79, 70, 229, 0.4)'
  },
  nurse_call: {
    primary: '#0d9488',
    secondary: '#2dd4bf',
    accent: '#0f766e',
    stroke: '#115e59',
    glow: 'rgba(13, 148, 136, 0.4)'
  },
  beacon: {
    primary: '#d97706',
    secondary: '#fef08a',
    accent: '#b45309',
    stroke: '#78350f',
    glow: 'rgba(217, 119, 6, 0.4)'
  },
  // Legacy alias
  speaker: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    accent: '#d97706',
    stroke: '#b45309',
    glow: 'rgba(245, 158, 11, 0.4)'
  }
}

export function getVoceoColor(type: string): VoceoColorDef {
  return VOCEO_COLORS[type] ?? VOCEO_COLORS.speaker_ceiling
}

/**
 * Renderiza el ícono vectorial específico para un dispositivo de voceo en Canvas 2D.
 */
export function drawVoceoIcon(
  ctx: CanvasRenderingContext2D,
  opts: {
    type: string
    state?: VoceoIconState
    iconScale: number
    viewportScale: number
    rotationDeg: number
    drawDirection?: boolean
  }
) {
  const { type, state = 'normal', iconScale, viewportScale, rotationDeg, drawDirection = true } = opts
  const colors = getVoceoColor(type)

  const size = 18 * iconScale
  
  ctx.save()

  // Usar utilidades comunes para resolver estilos
  const style = resolveIconStyle(colors, { state, viewportScale, size })
  setupIconContext(ctx, style.mainColor, style.strokeColor, style.lineWidth)

  // --- Dibujar la geometría según la categoría del dispositivo ---
  switch (type) {
    case 'speaker_ceiling':
    case 'speaker': {
      // Altavoz de techo empotrado: Círculo exterior + aro interno + rejilla/difusor
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 3.2, 0, Math.PI * 2)
      ctx.fill()

      // Rejilla de difusor central (patrón cónico)
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, 0, size / 6, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'speaker_wall': {
      // Altavoz de pared (Gabinete inclinado): Trapecio con cono proyectado
      const w = size * 0.8
      const h = size * 0.9
      ctx.beginPath()
      ctx.moveTo(-w / 2, -h / 2)
      ctx.lineTo(w / 3, -h / 2.6)
      ctx.lineTo(w / 3, h / 2.6)
      ctx.lineTo(-w / 2, h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Cono frontal de bocina
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(w / 6, 0, h / 3.5, -Math.PI / 2, Math.PI / 2)
      ctx.fill()
      break
    }

    case 'horn': {
      // Corneta exterior abocinada
      ctx.beginPath()
      ctx.moveTo(-size / 2, -size / 3.5)
      ctx.lineTo(size / 3, -size / 2.2)
      ctx.lineTo(size / 2, -size / 2.5)
      ctx.lineTo(size / 2, size / 2.5)
      ctx.lineTo(size / 3, size / 2.2)
      ctx.lineTo(-size / 2, size / 3.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Ondas sonoras salientes
      ctx.strokeStyle = colors.secondary
      ctx.lineWidth = Math.max(1, 1.2 / viewportScale)
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath()
        ctx.arc(size / 4, 0, (size / 3) + (i * size / 5), -Math.PI / 3, Math.PI / 3)
        ctx.stroke()
      }
      break
    }

    case 'gateway': {
      // Gateway / Módulo IP / PCB: Hexágono tecnológico o módulo con chip
      const r = size / 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const x = r * Math.cos(angle)
        const y = r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Núcleo central tipo chip IP
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2)

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, size / 8, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'amplifier': {
      // Amplificador de potencia: Chasis de rack rectangular con perilla y vumetro
      const w = size * 0.95
      const h = size * 0.65
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Perilla de volumen principal
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(-w / 4, 0, h / 3.5, 0, Math.PI * 2)
      ctx.fill()

      // Indicadores VU meter / luces led derecha
      ctx.fillStyle = colors.secondary
      ctx.fillRect(w / 8, -h / 3, w / 4, h / 6)
      ctx.fillRect(w / 8, 0, w / 4, h / 6)
      break
    }

    case 'microphone': {
      // Consola de micrófono / Cuello de ganso
      // Base rectangular de mesa
      const bw = size * 0.7
      const bh = size * 0.4
      ctx.beginPath()
      ctx.roundRect(-bw / 2, size / 8, bw, bh, 2)
      ctx.fill()
      ctx.stroke()

      // Mástil de cuello de ganso
      ctx.strokeStyle = colors.secondary
      ctx.lineWidth = Math.max(1.2, 1.8 / viewportScale)
      ctx.beginPath()
      ctx.moveTo(0, size / 8)
      ctx.quadraticCurveTo(size / 4, -size / 6, -size / 8, -size / 2.4)
      ctx.stroke()

      // Cápsula de micrófono
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(-size / 8, -size / 2.4, size / 6, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'panel': {
      // Panel de control / Servidor de voceo
      const w = size * 0.9
      const h = size * 0.75
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 3)
      ctx.fill()
      ctx.stroke()

      // Pantalla de monitoreo / Pantalla matriz
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-w / 2.5, -h / 2.6, w * 0.8, h * 0.4)

      // Fila de botones de zona
      ctx.fillStyle = colors.accent
      ctx.fillRect(-w / 2.5, h / 6, w * 0.2, h * 0.2)
      ctx.fillRect(-w / 8, h / 6, w * 0.2, h * 0.2)
      ctx.fillRect(w / 6, h / 6, w * 0.2, h * 0.2)
      break
    }

    case 'nurse_call': {
      // Terminal de llamado de enfermera: Escudo con cruz de atención
      const sHalf = size / 2.1
      ctx.beginPath()
      ctx.moveTo(0, -sHalf)
      ctx.lineTo(sHalf, -sHalf / 2)
      ctx.lineTo(sHalf, sHalf / 3)
      ctx.lineTo(0, sHalf)
      ctx.lineTo(-sHalf, sHalf / 3)
      ctx.lineTo(-sHalf, -sHalf / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Cruz central blanca
      ctx.fillStyle = '#ffffff'
      const armW = size / 6
      const armL = size / 2.4
      ctx.fillRect(-armW / 2, -armL / 2, armW, armL)
      ctx.fillRect(-armL / 2, -armW / 2, armL, armW)
      break
    }

    case 'beacon': {
      // Luminaria / Estrobo de voceo: Diamante radiante
      const hSize = size / 1.8
      ctx.beginPath()
      ctx.moveTo(0, -hSize)
      ctx.lineTo(hSize, 0)
      ctx.lineTo(0, hSize)
      ctx.lineTo(-hSize, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Núcleo brillante
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 4, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    default: {
      // Fallback circular seguro
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }
  }

  // Anillo de selección si está seleccionado
  if (style.isSelected) {
    ctx.strokeStyle = colors.primary
    ctx.lineWidth = 2 / viewportScale
    ctx.setLineDash([3 / viewportScale, 3 / viewportScale])
    ctx.beginPath()
    ctx.arc(0, 0, (size / 2) + (4 / viewportScale), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Indicador de rotación/orientación (Línea de dirección)
  if (drawDirection !== false) {
    const dirAngle = rotationDeg * (Math.PI / 180)
    ctx.strokeStyle = style.strokeColor
    ctx.lineWidth = Math.max(1, 2 / viewportScale)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo((size / 2) * Math.cos(dirAngle), (size / 2) * Math.sin(dirAngle))
    ctx.stroke()
  }

  ctx.restore()
}
