import type { FireDeviceType } from './device'

export type FireIconState = 'normal' | 'hover' | 'selected' | 'disabled'

export interface FireColorDef {
  primary: string
  secondary: string
  accent: string
  stroke: string
  glow: string
}

export const FIRE_COLORS: Record<string, FireColorDef> = {
  panel: {
    primary: '#dc2626',
    secondary: '#991b1b',
    accent: '#fca5a5',
    stroke: '#7f1d1d',
    glow: 'rgba(220, 38, 38, 0.4)'
  },
  smoke_detector: {
    primary: '#f8fafc',
    secondary: '#475569',
    accent: '#ef4444',
    stroke: '#334155',
    glow: 'rgba(239, 68, 68, 0.4)'
  },
  heat_detector: {
    primary: '#f97316',
    secondary: '#c2410c',
    accent: '#fef08a',
    stroke: '#7c2d12',
    glow: 'rgba(249, 115, 22, 0.4)'
  },
  smoke_heat_detector: {
    primary: '#ea580c',
    secondary: '#881337',
    accent: '#fde047',
    stroke: '#450a0a',
    glow: 'rgba(234, 88, 12, 0.4)'
  },
  gas_co_detector: {
    primary: '#0d9488',
    secondary: '#115e59',
    accent: '#67e8f9',
    stroke: '#042f2e',
    glow: 'rgba(13, 148, 136, 0.4)'
  },
  manual_station: {
    primary: '#b91c1c',
    secondary: '#7f1d1d',
    accent: '#fef08a',
    stroke: '#450a0a',
    glow: 'rgba(185, 28, 28, 0.4)'
  },
  explosion_proof_station: {
    primary: '#991b1b',
    secondary: '#1e293b',
    accent: '#facc15',
    stroke: '#0f172a',
    glow: 'rgba(153, 27, 27, 0.4)'
  },
  horn_strobe: {
    primary: '#dc2626',
    secondary: '#7f1d1d',
    accent: '#facc15',
    stroke: '#450a0a',
    glow: 'rgba(220, 38, 38, 0.4)'
  },
  strobe_light: {
    primary: '#f59e0b',
    secondary: '#fef08a',
    accent: '#b45309',
    stroke: '#78350f',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  led_indicator: {
    primary: '#16a34a',
    secondary: '#86efac',
    accent: '#14532d',
    stroke: '#052e16',
    glow: 'rgba(22, 163, 74, 0.4)'
  },
  module: {
    primary: '#0284c7',
    secondary: '#0f172a',
    accent: '#38bdf8',
    stroke: '#075985',
    glow: 'rgba(2, 132, 199, 0.4)'
  },
  power_supply: {
    primary: '#d97706',
    secondary: '#78350f',
    accent: '#fef08a',
    stroke: '#451a03',
    glow: 'rgba(217, 119, 6, 0.4)'
  },
  base: {
    primary: '#64748b',
    secondary: '#cbd5e1',
    accent: '#e2e8f0',
    stroke: '#334155',
    glow: 'rgba(100, 116, 139, 0.4)'
  }
}

export function getFireColor(type: string): FireColorDef {
  return FIRE_COLORS[type] ?? FIRE_COLORS.panel
}

/**
 * Renderiza el ícono vectorial específico para un dispositivo de incendio en Canvas 2D.
 */
export function drawFireIcon(
  ctx: CanvasRenderingContext2D,
  opts: {
    type: string
    state?: FireIconState
    iconScale: number
    viewportScale: number
    rotationDeg: number
    drawDirection?: boolean
  }
) {
  const { type, state = 'normal', iconScale, viewportScale, rotationDeg, drawDirection = true } = opts
  const colors = getFireColor(type)
  const isSelected = state === 'selected'
  const isHover = state === 'hover'
  const isDisabled = state === 'disabled'

  const size = 18 * iconScale
  const lineWidth = Math.max(1, 1.5 / viewportScale)

  ctx.save()

  // Resplandor en selección o hover
  if (isSelected) {
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = 10 / viewportScale
  } else if (isHover) {
    ctx.shadowColor = 'rgba(15, 23, 42, 0.25)'
    ctx.shadowBlur = 6 / viewportScale
  }

  // Selección de color según estado
  const mainColor = isDisabled ? '#94a3b8' : colors.primary
  const strokeColor = isDisabled ? '#64748b' : isSelected ? '#1e40af' : colors.stroke

  ctx.fillStyle = mainColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = isSelected ? lineWidth * 1.5 : lineWidth

  switch (type) {
    case 'panel': {
      // Tablero / Panel de Incendio: Gabinete rectangular con pantalla LCD y LEDs de estado
      const w = size * 0.95
      const h = size * 0.8
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Franja de cabecera de alarma
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h * 0.25)

      // Pantalla LCD azul/cian
      ctx.fillStyle = '#0284c7'
      ctx.fillRect(-w / 3, -h / 8, w * 0.5, h * 0.35)

      // LEDs de estado (Verde, Amarillo, Rojo)
      const ledR = size * 0.08
      ctx.fillStyle = '#22c55e' // Verde Operativo
      ctx.beginPath()
      ctx.arc(w / 3.2, -h / 8, ledR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#eab308' // Amarillo Falla
      ctx.beginPath()
      ctx.arc(w / 3.2, 0, ledR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ef4444' // Rojo Alarma
      ctx.beginPath()
      ctx.arc(w / 3.2, h / 8, ledR, 0, Math.PI * 2)
      ctx.fill()

      // Teclas inferiores de control
      ctx.fillStyle = colors.accent
      ctx.fillRect(-w / 3, h / 4, w * 0.2, h * 0.15)
      ctx.fillRect(-w / 12, h / 4, w * 0.2, h * 0.15)
      break
    }

    case 'smoke_detector': {
      // Detector de Humo: Cuerpo circular blanco/gris con cámara óptica concéntrica y ranuras
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Anillo concéntrico interno
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 3, 0, Math.PI * 2)
      ctx.fill()

      // Núcleo infrarrojo central
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, 0, size / 7, 0, Math.PI * 2)
      ctx.fill()

      // Ranuras ópticas radiales
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1, 1 / viewportScale)
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2
        ctx.beginPath()
        ctx.moveTo((size / 4) * Math.cos(angle), (size / 4) * Math.sin(angle))
        ctx.lineTo((size / 2.3) * Math.cos(angle), (size / 2.3) * Math.sin(angle))
        ctx.stroke()
      }
      break
    }

    case 'heat_detector': {
      // Detector Térmico: Octágono / círculo térmico con termistor central y estrella de captación
      const r = size / 2
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4
        const x = r * Math.cos(angle)
        const y = r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Disco térmico interno
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 3.2, 0, Math.PI * 2)
      ctx.fill()

      // Termistor central / estrella térmica
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1.2, 1.8 / viewportScale)
      ctx.beginPath()
      ctx.moveTo(-size / 4, 0)
      ctx.lineTo(size / 4, 0)
      ctx.moveTo(0, -size / 4)
      ctx.lineTo(0, size / 4)
      ctx.stroke()

      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, 0, size / 8, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'smoke_heat_detector': {
      // Detector Combinado Humo + Calor: Doble anillo concéntrico con estrella integrada
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Anillo intermedio
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 2.8, 0, Math.PI * 2)
      ctx.fill()

      // Núcleo térmico
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, 0, size / 5, 0, Math.PI * 2)
      ctx.fill()

      // 4 Puntos sensores periféricos
      ctx.fillStyle = colors.accent
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4
        const px = (size / 3.4) * Math.cos(angle)
        const py = (size / 3.4) * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(px, py, size / 12, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'gas_co_detector': {
      // Detector de Gas / CO: Envolvente octagonal/hexagonal con rejilla metálica
      const r = size / 2.1
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + Math.PI / 6
        const x = r * Math.cos(angle)
        const y = r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Rejilla de captación de gas (Líneas paralelas)
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1, 1.2 / viewportScale)
      const wLine = size / 3
      ctx.beginPath()
      ctx.moveTo(-wLine, -size / 6)
      ctx.lineTo(wLine, -size / 6)
      ctx.moveTo(-wLine, 0)
      ctx.lineTo(wLine, 0)
      ctx.moveTo(-wLine, size / 6)
      ctx.lineTo(wLine, size / 6)
      ctx.stroke()

      // Punto LED de estado
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, 0, size / 9, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'manual_station': {
      // Estación Manual de Jalón: Estación cuadrada roja con palanca blanca/amarilla prominente
      const w = size * 0.85
      const h = size * 0.95
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Ventana interna blanca/amarilla
      ctx.fillStyle = colors.accent
      ctx.fillRect(-w / 3, -h / 3, w * 0.66, h * 0.5)

      // Palanca de jalón "PULL"
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.moveTo(-w / 4, -h / 6)
      ctx.lineTo(w / 4, -h / 6)
      ctx.lineTo(w / 6, h / 8)
      ctx.lineTo(-w / 6, h / 8)
      ctx.closePath()
      ctx.fill()

      // Flecha indicadora hacia abajo
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(0, -h / 10)
      ctx.lineTo(w / 10, h / 14)
      ctx.lineTo(-w / 10, h / 14)
      ctx.closePath()
      ctx.fill()
      break
    }

    case 'explosion_proof_station': {
      // Estación Antiexplosiva: Gabinete octagonal pesado con pernos y botón central
      const r = size / 1.9
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + Math.PI / 8
        const x = r * Math.cos(angle)
        const y = r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Pernos en esquinas
      ctx.fillStyle = colors.secondary
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2
        const bx = (r * 0.7) * Math.cos(angle)
        const by = (r * 0.7) * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(bx, by, size / 14, 0, Math.PI * 2)
        ctx.fill()
      }

      // Botón central de emergencia
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, 0, size / 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'horn_strobe': {
      // Corneta con Estrobo A/V: Difusor de bocina superior + lente de estrobo inferior
      const w = size * 0.75
      const h = size * 0.95
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Difusor de bocina superior (ranuras de sonido)
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-w / 2.8, -h / 2.4, w * 0.7, h * 0.35)

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1, 1 / viewportScale)
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.moveTo(i * (w / 6), -h / 2.4 + 2)
        ctx.lineTo(i * (w / 6), -h / 2.4 + (h * 0.35) - 2)
        ctx.stroke()
      }

      // Lente de estrobo inferior
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(0, h / 4, size / 5, 0, Math.PI * 2)
      ctx.fill()

      // Rayos de destello
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1, 1.2 / viewportScale)
      for (let i = 0; i < 3; i++) {
        const angle = (i - 1) * (Math.PI / 4) + Math.PI / 2
        ctx.beginPath()
        ctx.moveTo((size / 4) * Math.cos(angle), h / 4 + (size / 4) * Math.sin(angle))
        ctx.lineTo((size / 2.4) * Math.cos(angle), h / 4 + (size / 2.4) * Math.sin(angle))
        ctx.stroke()
      }
      break
    }

    case 'strobe_light': {
      // Estrobo solo / Beacon: Diamante vibrante con destellos radiantes en 8 direcciones
      const hSize = size / 2.1
      ctx.beginPath()
      ctx.moveTo(0, -hSize)
      ctx.lineTo(hSize, 0)
      ctx.lineTo(0, hSize)
      ctx.lineTo(-hSize, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Núcleo transparente brillante
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 3.8, 0, Math.PI * 2)
      ctx.fill()

      // Destellos radiantes
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1, 1.2 / viewportScale)
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4
        ctx.beginPath()
        ctx.moveTo((size / 3) * Math.cos(angle), (size / 3) * Math.sin(angle))
        ctx.lineTo((size / 1.8) * Math.cos(angle), (size / 1.8) * Math.sin(angle))
        ctx.stroke()
      }
      break
    }

    case 'led_indicator': {
      // Indicador LED Remoto: Círculo verde esmeralda brillante
      ctx.beginPath()
      ctx.arc(0, 0, size / 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Resplandor interno
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 3.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(-size / 8, -size / 8, size / 10, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'module': {
      // Módulo de Monitoreo / Relevador / Aislador: Caja cuadrada zafiro con terminales de clemas
      const w = size * 0.85
      const h = size * 0.85
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Bloques de terminales (clemas) superiores e inferiores
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-w / 2.2, -h / 2, w * 0.9, h * 0.2)
      ctx.fillRect(-w / 2.2, h / 2 - h * 0.2, w * 0.9, h * 0.2)

      // Microchip central
      ctx.fillStyle = colors.accent
      ctx.fillRect(-w / 4, -h / 6, w / 2, h / 3)
      break
    }

    case 'power_supply': {
      // Fuente de Poder / Supresor / Batería: Gabinete dorado con símbolo de rayo eléctrico
      const w = size * 0.8
      const h = size * 0.95
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Símbolo de rayo eléctrico
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.moveTo(w / 10, -h / 3)
      ctx.lineTo(-w / 4, 0)
      ctx.lineTo(0, 0)
      ctx.lineTo(-w / 10, h / 3)
      ctx.lineTo(w / 4, 0)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fill()
      break
    }

    case 'base': {
      // Base de Sensor: Zócalo de montaje con trazo punteado
      ctx.setLineDash([3 / viewportScale, 3 / viewportScale])
      ctx.beginPath()
      ctx.arc(0, 0, size / 2.1, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size / 3.5, 0, Math.PI * 2)
      ctx.fill()

      // Orejas de fijación
      ctx.fillStyle = colors.primary
      ctx.fillRect(-size / 2, -size / 10, size / 6, size / 5)
      ctx.fillRect(size / 2 - size / 6, -size / 10, size / 6, size / 5)
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

  // Anillo de selección
  if (isSelected) {
    ctx.strokeStyle = colors.primary
    ctx.lineWidth = 2 / viewportScale
    ctx.setLineDash([3 / viewportScale, 3 / viewportScale])
    ctx.beginPath()
    ctx.arc(0, 0, (size / 2) + (4 / viewportScale), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Indicador de orientación (Línea de dirección)
  if (drawDirection !== false) {
    const dirAngle = (rotationDeg ?? 0) * (Math.PI / 180)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(1, 2 / viewportScale)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo((size / 2) * Math.cos(dirAngle), (size / 2) * Math.sin(dirAngle))
    ctx.stroke()
  }

  ctx.restore()
}
