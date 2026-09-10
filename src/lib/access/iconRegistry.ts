import type { AccessDeviceType } from '@/lib/access/device'

export type AccessIconState = 'normal' | 'hover' | 'selected' | 'disabled'

export type AccessIconKey =
  | 'generic'
  | 'terminal'
  | 'terminal_face'
  | 'terminal_fingerprint'
  | 'reader_card'
  | 'turnstile'
  | 'lock'
  | 'exit_button'
  | 'emergency_button'
  | 'key_switch'
  | 'controller_panel'

export interface AccessColorDef {
  primary: string
  secondary: string
  accent: string
  screen?: string
  stroke: string
  glow: string
}

export const ACCESS_COLORS: Record<string, AccessColorDef> = {
  terminal_face: {
    primary: '#7c3aed',
    secondary: '#4c1d95',
    accent: '#a78bfa',
    screen: '#0f172a',
    stroke: '#5b21b6',
    glow: 'rgba(124, 58, 237, 0.45)'
  },
  terminal_fingerprint: {
    primary: '#4338ca',
    secondary: '#1e1b4b',
    accent: '#34d399',
    screen: '#0284c7',
    stroke: '#312e81',
    glow: 'rgba(67, 56, 202, 0.45)'
  },
  terminal: {
    primary: '#6d28d9',
    secondary: '#3b0764',
    accent: '#cbd5e1',
    screen: '#0f172a',
    stroke: '#4c1d95',
    glow: 'rgba(109, 40, 217, 0.45)'
  },
  reader_card: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#60a5fa',
    stroke: '#1e3a8a',
    glow: 'rgba(37, 99, 235, 0.45)'
  },
  turnstile: {
    primary: '#475569',
    secondary: '#0f172a',
    accent: '#cbd5e1',
    stroke: '#1e293b',
    glow: 'rgba(71, 85, 105, 0.45)'
  },
  lock: {
    primary: '#0284c7',
    secondary: '#0369a1',
    accent: '#e2e8f0',
    stroke: '#075985',
    glow: 'rgba(2, 132, 199, 0.45)'
  },
  exit_button: {
    primary: '#059669',
    secondary: '#065f46',
    accent: '#34d399',
    stroke: '#022c22',
    glow: 'rgba(5, 150, 105, 0.45)'
  },
  emergency_button: {
    primary: '#dc2626',
    secondary: '#991b1b',
    accent: '#facc15',
    stroke: '#7f1d1d',
    glow: 'rgba(220, 38, 38, 0.45)'
  },
  key_switch: {
    primary: '#64748b',
    secondary: '#334155',
    accent: '#eab308',
    stroke: '#1e293b',
    glow: 'rgba(100, 116, 139, 0.45)'
  },
  controller_panel: {
    primary: '#334155',
    secondary: '#1e293b',
    accent: '#38bdf8',
    stroke: '#0f172a',
    glow: 'rgba(51, 65, 85, 0.45)'
  },
  generic: {
    primary: '#64748b',
    secondary: '#475569',
    accent: '#94a3b8',
    stroke: '#334155',
    glow: 'rgba(100, 116, 139, 0.45)'
  }
}

export function getAccessColor(key: string): AccessColorDef {
  return ACCESS_COLORS[key] ?? ACCESS_COLORS.generic
}

export function isKnownAccessIconKey(key: string | undefined | null): key is AccessIconKey {
  if (!key) return false
  return Object.prototype.hasOwnProperty.call(ACCESS_COLORS, key)
}

export function resolveAccessIconKeyForDevice(dev: { iconKey?: string; type?: AccessDeviceType }): AccessIconKey {
  if (isKnownAccessIconKey(dev.iconKey)) return dev.iconKey
  if (dev.type === 'terminal') return 'terminal'
  if (dev.type === 'lock') return 'lock'
  if (dev.type === 'exit_button') return 'exit_button'
  if (dev.type === 'emergency_button') return 'emergency_button'
  return 'generic'
}

export function getAccessIconDef(key: string | undefined | null): { key: AccessIconKey; baseColor: string } {
  const resolvedKey = isKnownAccessIconKey(key) ? key : 'generic'
  const colors = getAccessColor(resolvedKey)
  return {
    key: resolvedKey,
    baseColor: colors.primary
  }
}

/**
 * Renderiza el ícono vectorial específico para un dispositivo de control de acceso en Canvas 2D.
 */
export function drawAccessIcon(
  ctx: CanvasRenderingContext2D,
  opts: {
    iconKey?: string
    type?: AccessDeviceType
    state: AccessIconState
    iconScale: number
    viewportScale: number
    rotationDeg: number
    drawDirection?: boolean
  }
) {
  const { state = 'normal', iconScale, viewportScale, rotationDeg, drawDirection = true } = opts
  const key = resolveAccessIconKeyForDevice({ iconKey: opts.iconKey, type: opts.type })
  const colors = getAccessColor(key)

  const isSelected = state === 'selected'
  const isHover = state === 'hover'
  const isDisabled = state === 'disabled'

  const size = 18 * iconScale
  const lineWidth = Math.max(1, 1.5 / viewportScale)

  ctx.save()

  // Sombra y resplandor en selección o hover
  if (isSelected) {
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = 10 / viewportScale
  } else if (isHover) {
    ctx.shadowColor = 'rgba(15, 23, 42, 0.25)'
    ctx.shadowBlur = 6 / viewportScale
  }

  const mainColor = isDisabled ? '#94a3b8' : colors.primary
  const strokeColor = isDisabled ? '#64748b' : isSelected ? '#1e40af' : colors.stroke

  ctx.fillStyle = mainColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = isSelected ? lineWidth * 1.5 : lineWidth

  switch (key) {
    case 'terminal_face': {
      // Terminal de Reconocimiento Facial (SpeedFace V5L / Senseface 7A):
      // Kiosco vertical con biseles curvos, doble lente óptico (RGB/IR), visor facial luminoso y barra LED inferior
      const w = size * 0.8
      const h = size * 0.98
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, [4, 4, 3, 3])
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Cristal frontal oscuro de pantalla
      ctx.fillStyle = colors.screen || '#0f172a'
      ctx.fillRect(-w / 2.3, -h / 2.3, w * 0.86, h * 0.72)

      // Cáncamos / Doble Lente Óptico (Cámara RGB + Sensor Infrarrojo)
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(-w / 5, -h / 3, size * 0.07, 0, Math.PI * 2)
      ctx.arc(w / 5, -h / 3, size * 0.07, 0, Math.PI * 2)
      ctx.fill()

      // Visor de retícula facial (recuadros HUD de reconocimiento)
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1, 1 / viewportScale)
      const fw = w * 0.4
      const fh = h * 0.3
      const fy = -h * 0.05
      // Esquinas HUD cara
      ctx.beginPath()
      ctx.moveTo(-fw / 2, fy - fh / 2 + 2); ctx.lineTo(-fw / 2, fy - fh / 2); ctx.lineTo(-fw / 2 + 2, fy - fh / 2)
      ctx.moveTo(fw / 2 - 2, fy - fh / 2); ctx.lineTo(fw / 2, fy - fh / 2); ctx.lineTo(fw / 2, fy - fh / 2 + 2)
      ctx.moveTo(-fw / 2, fy + fh / 2 - 2); ctx.lineTo(-fw / 2, fy + fh / 2); ctx.lineTo(-fw / 2 + 2, fy + fh / 2)
      ctx.moveTo(fw / 2 - 2, fy + fh / 2); ctx.lineTo(fw / 2, fy + fh / 2); ctx.lineTo(fw / 2, fy + fh / 2 - 2)
      ctx.stroke()

      // Silueta facial dentro del HUD
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.beginPath()
      ctx.arc(0, fy - 1, size * 0.08, 0, Math.PI * 2)
      ctx.fill()

      // Barra LED de retroalimentación en la base
      ctx.fillStyle = '#10b981'
      ctx.fillRect(-w / 3, h / 2 - h * 0.12, w * 0.66, h * 0.06)
      break
    }

    case 'terminal_fingerprint': {
      // Terminal Biométrica con Huella Dactilar y Teclado:
      // Gabinete rectangular con pantalla superior, sensor óptico de huella concéntrico y matriz de botones PIN
      const w = size * 0.82
      const h = size * 0.95
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 3)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Pantalla LCD superior
      ctx.fillStyle = colors.screen || '#0284c7'
      ctx.fillRect(-w / 2.3, -h / 2.3, w * 0.86, h * 0.28)

      // Cristal del Lector Óptico de Huella (Círculo con arcos concéntricos)
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1, 1 / viewportScale)
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath()
        ctx.arc(0, 0, (size * 0.05) * i, Math.PI * 0.2, Math.PI * 0.8)
        ctx.stroke()
      }

      // Teclado matricial PIN inferior
      ctx.fillStyle = colors.accent
      const kw = w * 0.18
      const kh = h * 0.08
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const kx = (col - 1) * (w * 0.26)
          const ky = h * 0.25 + row * (h * 0.12)
          ctx.fillRect(kx - kw / 2, ky - kh / 2, kw, kh)
        }
      }
      break
    }

    case 'reader_card':
    case 'terminal': {
      // Lector de Tarjetas RFID / Proximidad / Wiegand:
      // Placa estilizada de pared con arcos de radiación inalámbrica y silueta de tarjeta contactless
      const w = size * 0.72
      const h = size * 0.95
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 3)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Tarjeta RFID blanca interna
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(-w / 3, -h / 4, w * 0.66, h * 0.42)
      ctx.strokeStyle = colors.secondary
      ctx.lineWidth = 1 / viewportScale
      ctx.strokeRect(-w / 3, -h / 4, w * 0.66, h * 0.42)

      // Ondas concéntricas de señal RF
      ctx.strokeStyle = colors.primary
      ctx.lineWidth = Math.max(1, 1.2 / viewportScale)
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath()
        ctx.arc(w / 6, -h / 20, (size * 0.06) * i, -Math.PI * 0.4, Math.PI * 0.4)
        ctx.stroke()
      }

      // LED indicador bicolor (verde listo)
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(0, h / 2.8, size * 0.08, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'turnstile': {
      // Torniquete Peatonal / Barrera Tripode (Aegis2000 / Cuerpo Completo):
      // Gabinete hexagonal metálico con 3 brazos giratorios en 120° y flecha LED de acceso
      const r = size * 0.48
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const px = r * Math.cos(angle)
        const py = r * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Brazos giratorios metálicos del trípode (3 aspas a 120°)
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1.5, 2.2 / viewportScale)
      for (let i = 0; i < 3; i++) {
        const angle = (i * (2 * Math.PI / 3)) - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo((size * 0.45) * Math.cos(angle), (size * 0.45) * Math.sin(angle))
        ctx.stroke()
      }

      // Disco central y LED verde de pase
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'lock': {
      // Chapa Magnética / Electroimán (MAG600BZ):
      // Bloque electromagnético horizontal de alta presión con placa de hierro, bobina y candado/LED
      const w = size * 0.98
      const h = size * 0.55
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Placa de hierro de inducción magnética
      ctx.fillStyle = colors.accent
      ctx.fillRect(-w / 2.2, -h / 6, w * 0.9, h * 0.35)

      // Líneas de bobina electromagnética
      ctx.strokeStyle = colors.secondary
      ctx.lineWidth = Math.max(1, 1 / viewportScale)
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(i * (w / 6), -h / 6)
        ctx.lineTo(i * (w / 6), h * 0.19)
        ctx.stroke()
      }

      // Candado de bloqueo cerrado / LED
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(w / 3, 0, size * 0.08, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'exit_button': {
      // Botón de Salida "No Touch" / Push to Exit (K11):
      // Placa cuadrada de pared con halo luminoso verde e ícono de palma / puerta saliendo
      const w = size * 0.85
      const h = size * 0.85
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 3)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Halo circular verde de activación infra-roja
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = colors.accent
      ctx.lineWidth = Math.max(1.2, 1.8 / viewportScale)
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
      ctx.stroke()

      // Ícono de flecha de salida
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(-size * 0.08, -size * 0.12)
      ctx.lineTo(size * 0.12, 0)
      ctx.lineTo(-size * 0.08, size * 0.12)
      ctx.closePath()
      ctx.fill()
      break
    }

    case 'emergency_button': {
      // Botón de Emergencia / Estación de Ruptura de Cristal (SS2422EX-ES):
      // Estación cuadrada roja con cubierta transparente de policarbonato, botón central y símbolo !
      const w = size * 0.85
      const h = size * 0.95
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 3)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Ventana de protección / Tapa transparente de policarbonato
      ctx.fillStyle = colors.accent
      ctx.fillRect(-w / 3, -h / 3, w * 0.66, h * 0.52)
      ctx.strokeStyle = '#991b1b'
      ctx.strokeRect(-w / 3, -h / 3, w * 0.66, h * 0.52)

      // Botón / Cristal con símbolo Exclamación de Alerta (!)
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.arc(0, -h / 12, size * 0.14, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(-size * 0.03, -h / 6, size * 0.06, size * 0.1)
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.03, 0, Math.PI * 2)
      ctx.fill()

      // Bisagra/llave de restablecimiento inferior
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-w / 6, h / 4, w * 0.33, h * 0.1)
      break
    }

    case 'key_switch': {
      // Interruptor de Llave (PROKSC):
      // Placa de acero inoxidable con cilindro de cerradura y llave de latón insertada
      const w = size * 0.85
      const h = size * 0.85
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 3)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Cilindro metálico de cerradura
      ctx.fillStyle = colors.secondary
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Llave de latón dorada insertada
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.arc(-size * 0.1, -size * 0.1, size * 0.1, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillRect(-size * 0.1, -size * 0.04, size * 0.28, size * 0.08)
      break
    }

    case 'controller_panel': {
      // Panel de Control / Fuente Regulada de Alimentación (PL12DC5ABK / XP18DC30UD):
      // Gabinete metálico pesado con rejillas, bloque de batería interna y LEDs indicadores
      const w = size * 0.95
      const h = size * 0.85
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-w / 2, -h / 2, w, h, 2)
      } else {
        ctx.rect(-w / 2, -h / 2, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Bloque de Batería de Respaldo interna
      ctx.fillStyle = colors.secondary
      ctx.fillRect(-w / 2.3, -h / 3, w * 0.5, h * 0.6)

      // Regleta de clemas de conexión
      ctx.fillStyle = colors.accent
      ctx.fillRect(w / 8, -h / 3, w * 0.3, h * 0.15)
      ctx.fillRect(w / 8, 0, w * 0.3, h * 0.15)

      // LEDs de estado (Verde Operativo, Ámbar Batería)
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(w / 3, h / 3, size * 0.06, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(w / 6, h / 3, size * 0.06, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    default: {
      // Fallback genérico circular con escudo de seguridad
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

  // Indicador de orientación (línea de dirección)
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
