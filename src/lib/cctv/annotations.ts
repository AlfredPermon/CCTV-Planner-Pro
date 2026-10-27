import type { CanvasAnnotation } from './types'

export type ScaleHandleKey = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export type AnnotationHandleKey = ScaleHandleKey | 'rotate'

// Caché global de imágenes para evitar descargas o reconversiones repetidas en el render loop
const imageCache = new Map<string, HTMLImageElement>()

/**
 * Recupera o crea la imagen en caché. Dispara un callback cuando termina la carga.
 */
function getOrLoadImage(url: string, onLoaded?: () => void): HTMLImageElement | null {
  if (!url) return null
  if (imageCache.has(url)) {
    const img = imageCache.get(url)!
    if (img.complete && img.naturalWidth > 0) return img
    return null
  }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    imageCache.set(url, img)
    if (onLoaded) onLoaded()
  }
  img.onerror = () => {
    // Si falla crossOrigin, reintentar sin crossOrigin
    img.crossOrigin = null
    img.src = url
  }
  img.src = url
  imageCache.set(url, img)
  return null
}

/**
 * Carga (o recupera de caché) la imagen de una anotación y resuelve la promesa
 * cuando está lista para ser dibujada. Se usa en la exportación a PDF para
 * garantizar que las imágenes insertadas se pinten antes de capturar el canvas.
 */
export function getOrLoadAnnotationImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null)
  const cached = imageCache.get(url)
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached)
  }
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = () => {
      img.crossOrigin = null
      img.onerror = () => resolve(null)
      img.src = url
    }
    img.src = url
    imageCache.set(url, img)
  })
}

/**
 * Rotación de un punto (px, py) alrededor del centro (cx, cy) un ángulo angleDeg (en grados).
 */
export function rotatePoint(px: number, py: number, cx: number, cy: number, angleDeg: number): { x: number; y: number } {
  if (!angleDeg) return { x: px, y: py }
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  }
}

/**
 * Des-rotación inversa de un punto (px, py) respecto al centro (cx, cy).
 */
export function unrotatePoint(px: number, py: number, cx: number, cy: number, angleDeg: number): { x: number; y: number } {
  return rotatePoint(px, py, cx, cy, -angleDeg)
}

/**
 * Calcula el centro geométrico de una anotación en espacio de mundo.
 */
export function getAnnotationCenter(ann: CanvasAnnotation): { cx: number; cy: number } {
  const box = getAnnotationBoundingBox(ann)
  return {
    cx: box.minX + (box.maxX - box.minX) / 2,
    cy: box.minY + (box.maxY - box.minY) / 2
  }
}

/**
 * Traza un rectángulo redondeado con fallback seguro cuando el contexto
 * no expone ctx.roundRect (p. ej. entornos de prueba o navegadores antiguos).
 */
function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius)
  } else {
    ctx.rect(x, y, w, h)
  }
}

/** Degradado lineal seguro: devuelve null si el contexto no lo soporta. */
function linearShade(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][]
): CanvasGradient | null {
  if (typeof ctx.createLinearGradient !== 'function') return null
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [offset, c] of stops) g.addColorStop(offset, c)
  return g
}

/** Degradado radial seguro: devuelve null si el contexto no lo soporta. */
function radialShade(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number,
  stops: [number, string][]
): CanvasGradient | null {
  if (typeof ctx.createRadialGradient !== 'function') return null
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)
  for (const [offset, c] of stops) g.addColorStop(offset, c)
  return g
}

/**
 * Renderiza objetos vectoriales en vista superior (top-down view 2D).
 * Estilo arquitectónico realista: volumen por luces/sombras, materiales y
 * detalles reconocibles (cristales, ruedas, follaje, mobiliario de oficina).
 */
export function drawTopDownObject(
  ctx: CanvasRenderingContext2D,
  ann: CanvasAnnotation,
  scale: number
) {
  const x = ann.x
  const y = ann.y
  const w = ann.width || 60
  const h = ann.height || 40
  const color = ann.fillColor || ann.strokeColor || '#3b82f6'
  const stroke = ann.strokeColor || '#1e293b'
  const subtype = ann.objectSubtype || 'car_sedan'

  ctx.save()

  switch (subtype) {
    /* =============================== VEHÍCULOS =============================== */
    case 'car_sedan':
    case 'car_suv':
    case 'truck': {
      const isSuv = subtype === 'car_suv'
      const isTruck = subtype === 'truck'
      const bodyRadius = Math.min(w, h) * (isTruck ? 0.14 : isSuv ? 0.2 : 0.26)
      const line = Math.max(1, 1.2 / scale)

      // Sombra proyectada
      ctx.fillStyle = 'rgba(15, 23, 42, 0.20)'
      traceRoundRect(ctx, x + w * 0.03, y + h * 0.1, w, h, bodyRadius)
      ctx.fill()

      // Neumáticos (sobresalen ligeramente del perfil)
      const wheelW = Math.max(3, w * 0.15)
      const wheelH = Math.max(2.5, h * 0.12)
      const wheelInset = w * 0.15
      ctx.fillStyle = '#0f172a'
      traceRoundRect(ctx, x + wheelInset, y - wheelH * 0.5, wheelW, wheelH, wheelH * 0.45)
      ctx.fill()
      traceRoundRect(ctx, x + wheelInset, y + h - wheelH * 0.5, wheelW, wheelH, wheelH * 0.45)
      ctx.fill()
      traceRoundRect(ctx, x + w - wheelInset - wheelW, y - wheelH * 0.5, wheelW, wheelH, wheelH * 0.45)
      ctx.fill()
      traceRoundRect(ctx, x + w - wheelInset - wheelW, y + h - wheelH * 0.5, wheelW, wheelH, wheelH * 0.45)
      ctx.fill()

      // Carrocería
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.4 / scale)
      traceRoundRect(ctx, x, y, w, h, bodyRadius)
      ctx.fill()
      ctx.stroke()

      // Volumen de la carrocería (brillo superior + sombreado inferior)
      const bodySheen = linearShade(ctx, x, y, x, y + h, [
        [0, 'rgba(255, 255, 255, 0.38)'],
        [0.4, 'rgba(255, 255, 255, 0)'],
        [1, 'rgba(0, 0, 0, 0.24)']
      ])
      if (bodySheen) {
        ctx.fillStyle = bodySheen
        traceRoundRect(ctx, x, y, w, h, bodyRadius)
        ctx.fill()
      }

      // Caja de carga (pick-up) en la parte trasera
      if (isTruck) {
        const bedX = x + w * 0.06
        const bedW = w * 0.42
        ctx.fillStyle = 'rgba(15, 23, 42, 0.16)'
        traceRoundRect(ctx, bedX, y + h * 0.12, bedW, h * 0.76, Math.min(w, h) * 0.06)
        ctx.fill()
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)'
        ctx.lineWidth = line
        ctx.stroke()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
        for (let i = 1; i <= 3; i++) {
          ctx.fillRect(bedX + (bedW * i) / 4, y + h * 0.14, Math.max(1, 1 / scale), h * 0.72)
        }
      }

      // Cabina acristalada
      const cabX = isTruck ? x + w * 0.5 : isSuv ? x + w * 0.24 : x + w * 0.28
      const cabW = isTruck ? w * 0.26 : isSuv ? w * 0.52 : w * 0.44
      const cabY = y + h * 0.14
      const cabH = h * 0.72
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
      traceRoundRect(ctx, cabX, cabY, cabW, cabH, Math.min(cabW, cabH) * (isSuv ? 0.18 : 0.28))
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
      ctx.lineWidth = line
      ctx.stroke()

      // Techo (panel central de la carrocería)
      const roofW = cabW * (isSuv ? 0.5 : 0.44)
      ctx.fillStyle = color
      traceRoundRect(ctx, cabX + (cabW - roofW) / 2, cabY + cabH * 0.12, roofW, cabH * 0.76, Math.min(roofW, cabH) * 0.28)
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)'
      ctx.fill()

      // Barras de techo (SUV)
      if (isSuv) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)'
        ctx.fillRect(cabX, cabY - h * 0.045, cabW, Math.max(1, h * 0.045))
        ctx.fillRect(cabX, cabY + cabH, cabW, Math.max(1, h * 0.045))
      }

      // Espejos retrovisores
      const mirW = Math.max(2.5, w * 0.055)
      const mirH = Math.max(2, h * 0.14)
      ctx.fillStyle = stroke
      traceRoundRect(ctx, cabX - mirW * 0.6, y - mirH * 0.55, mirW, mirH, mirH * 0.35)
      ctx.fill()
      traceRoundRect(ctx, cabX - mirW * 0.6, y + h - mirH * 0.45, mirW, mirH, mirH * 0.35)
      ctx.fill()

      // Faros delanteros
      ctx.fillStyle = '#fde68a'
      traceRoundRect(ctx, x + w - w * 0.05, y + h * 0.13, w * 0.04, h * 0.17, Math.min(w, h) * 0.04)
      ctx.fill()
      traceRoundRect(ctx, x + w - w * 0.05, y + h * 0.7, w * 0.04, h * 0.17, Math.min(w, h) * 0.04)
      ctx.fill()

      // Luces traseras
      ctx.fillStyle = '#ef4444'
      traceRoundRect(ctx, x + w * 0.01, y + h * 0.13, w * 0.035, h * 0.17, Math.min(w, h) * 0.04)
      ctx.fill()
      traceRoundRect(ctx, x + w * 0.01, y + h * 0.7, w * 0.035, h * 0.17, Math.min(w, h) * 0.04)
      ctx.fill()

      break
    }

    /* =============================== PERSONAS =============================== */
    case 'person_man':
    case 'person_woman': {
      const isWoman = subtype === 'person_woman'
      const cx = x + w / 2
      const cy = y + h / 2
      const bodyRx = Math.max(3, w * 0.5)
      const bodyRy = Math.max(3, h * 0.42)
      const line = Math.max(1, 1.1 / scale)
      const hairColor = isWoman ? '#4c1d95' : '#1f2937'
      const skinColor = '#f3c9a1'

      // Sombra
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
      ctx.beginPath()
      ctx.ellipse(cx + w * 0.06, cy + h * 0.08, bodyRx * 0.98, bodyRy * 1.02, 0, 0, Math.PI * 2)
      ctx.fill()

      // Brazos
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = line
      ctx.beginPath()
      ctx.ellipse(cx - bodyRx * 0.18, cy - bodyRy * 0.82, bodyRx * 0.3, bodyRy * 0.42, -0.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(cx - bodyRx * 0.18, cy + bodyRy * 0.82, bodyRx * 0.3, bodyRy * 0.42, 0.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Torso / hombros
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(cx, cy, bodyRx, bodyRy, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Volumen del torso
      const torsoSheen = radialShade(ctx, cx - bodyRx * 0.25, cy - bodyRy * 0.3, 1, cx, cy, Math.max(2, bodyRx), [
        [0, 'rgba(255, 255, 255, 0.35)'],
        [1, 'rgba(0, 0, 0, 0.18)']
      ])
      if (torsoSheen) {
        ctx.fillStyle = torsoSheen
        ctx.beginPath()
        ctx.ellipse(cx, cy, bodyRx, bodyRy, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Cabello (vista cenital)
      const headR = Math.max(2.5, Math.min(w, h) * 0.3)
      if (isWoman) {
        ctx.fillStyle = hairColor
        ctx.beginPath()
        ctx.ellipse(cx - headR * 0.35, cy, headR * 1.15, headR * 1.3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = hairColor
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)'
      ctx.lineWidth = line
      ctx.beginPath()
      ctx.arc(cx, cy, headR, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Rostro visible hacia el frente
      ctx.fillStyle = skinColor
      ctx.beginPath()
      ctx.ellipse(cx + headR * 0.28, cy, headR * 0.62, headR * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Brillo del cabello
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      ctx.beginPath()
      ctx.arc(cx - headR * 0.35, cy - headR * 0.32, Math.max(1, headR * 0.35), 0, Math.PI * 2)
      ctx.fill()

      break
    }

    /* =============================== MUEBLES =============================== */
    case 'desk': {
      const radius = Math.min(w, h) * 0.16
      const line = Math.max(1, 1 / scale)

      // Sombra
      ctx.fillStyle = 'rgba(15, 23, 42, 0.16)'
      traceRoundRect(ctx, x + w * 0.02, y + h * 0.07, w, h, radius)
      ctx.fill()

      // Tablero
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.3 / scale)
      traceRoundRect(ctx, x, y, w, h, radius)
      ctx.fill()
      ctx.stroke()

      // Veta / brillo del tablero
      const topSheen = linearShade(ctx, x, y, x, y + h, [
        [0, 'rgba(255, 255, 255, 0.25)'],
        [0.45, 'rgba(255, 255, 255, 0)'],
        [1, 'rgba(0, 0, 0, 0.14)']
      ])
      if (topSheen) {
        ctx.fillStyle = topSheen
        traceRoundRect(ctx, x, y, w, h, radius)
        ctx.fill()
      }

      // Canto interior
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = line
      traceRoundRect(ctx, x + 3 / scale, y + 3 / scale, Math.max(1, w - 6 / scale), Math.max(1, h - 6 / scale), radius * 0.7)
      ctx.stroke()

      // Cajonera lateral
      const drW = w * 0.16
      const drH = h * 0.74
      const drX = x + w - drW - 3 / scale
      const drY = y + (h - drH) / 2
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'
      traceRoundRect(ctx, drX, drY, drW, drH, Math.min(drW, drH) * 0.2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.lineWidth = line
      ctx.stroke()

      // Tiradores
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(drX + drW * 0.3, drY + drH * (0.2 + i * 0.28), drW * 0.4, Math.max(1, 1.2 / scale))
      }

      break
    }

    case 'office_chair': {
      const cx = x + w / 2
      const cy = y + h / 2
      const radius = Math.min(w, h) / 2

      // Sombra
      ctx.fillStyle = 'rgba(15, 23, 42, 0.16)'
      ctx.beginPath()
      ctx.arc(cx + radius * 0.12, cy + radius * 0.14, Math.max(2, radius * 0.95), 0, Math.PI * 2)
      ctx.fill()

      // Base de 5 patas con ruedas
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.6 / scale)
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * (Math.PI / 180)
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + radius * 0.92 * Math.cos(a), cy + radius * 0.92 * Math.sin(a))
      }
      ctx.stroke()
      ctx.fillStyle = '#111827'
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * (Math.PI / 180)
        ctx.beginPath()
        ctx.arc(cx + radius * 0.94 * Math.cos(a), cy + radius * 0.94 * Math.sin(a), Math.max(1, radius * 0.13), 0, Math.PI * 2)
        ctx.fill()
      }

      // Respaldo curvo (posterior)
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(2, radius * 0.24)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, radius * 0.68), Math.PI * 0.62, Math.PI * 1.38)
      ctx.stroke()

      // Asiento
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.2 / scale)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, radius * 0.6), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      const seatSheen = linearShade(ctx, cx - radius, cy - radius, cx + radius, cy + radius, [
        [0, 'rgba(255, 255, 255, 0.3)'],
        [1, 'rgba(0, 0, 0, 0.18)']
      ])
      if (seatSheen) {
        ctx.fillStyle = seatSheen
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2, radius * 0.6), 0, Math.PI * 2)
        ctx.fill()
      }

      break
    }

    case 'computer': {
      const line = Math.max(1, 1 / scale)

      // Sombra del puesto de trabajo
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)'
      traceRoundRect(ctx, x + w * 0.04, y + h * 0.08, w * 0.92, h * 0.86, Math.min(w, h) * 0.12)
      ctx.fill()

      // Monitor
      const monW = w * 0.92
      const monH = Math.max(4, h * 0.28)
      const monX = x + (w - monW) / 2
      const monY = y + h * 0.06
      ctx.fillStyle = '#111827'
      ctx.strokeStyle = stroke
      ctx.lineWidth = line
      traceRoundRect(ctx, monX, monY, monW, monH, Math.min(monW, monH) * 0.2)
      ctx.fill()
      ctx.stroke()

      // Pantalla con brillo
      ctx.fillStyle =
        linearShade(ctx, monX, monY, monX + monW, monY + monH, [
          [0, '#7dd3fc'],
          [1, '#0284c7']
        ]) || '#38bdf8'
      traceRoundRect(ctx, monX + monW * 0.06, monY + monH * 0.2, monW * 0.88, monH * 0.6, Math.min(monW, monH) * 0.12)
      ctx.fill()

      // Teclado
      const kbdW = w * 0.62
      const kbdH = Math.max(4, h * 0.36)
      const kbdX = x + (w - kbdW) / 2
      const kbdY = y + h * 0.52
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = line
      traceRoundRect(ctx, kbdX, kbdY, kbdW, kbdH, Math.min(kbdW, kbdH) * 0.22)
      ctx.fill()
      ctx.stroke()

      // Filas de teclas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      for (let r = 0; r < 3; r++) {
        ctx.fillRect(kbdX + kbdW * 0.08, kbdY + kbdH * (0.2 + r * 0.26), kbdW * 0.84, Math.max(1, kbdH * 0.1))
      }

      // Ratón
      ctx.fillStyle = '#475569'
      traceRoundRect(ctx, x + w * 0.84, y + h * 0.58, Math.max(2.5, w * 0.12), Math.max(3, h * 0.24), Math.min(w, h) * 0.35)
      ctx.fill()

      break
    }

    /* =============================== VERDES =============================== */
    case 'tree': {
      const cx = x + w / 2
      const cy = y + h / 2
      const radius = Math.min(w, h) / 2

      // Sombra
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
      ctx.beginPath()
      ctx.arc(cx + radius * 0.14, cy + radius * 0.14, Math.max(2, radius * 0.92), 0, Math.PI * 2)
      ctx.fill()

      // Copa base
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.3 / scale)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(3, radius * 0.94), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Lóbulos de follaje claros
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      for (let i = 0; i < 7; i++) {
        const a = (i * (360 / 7) * Math.PI) / 180
        ctx.beginPath()
        ctx.arc(cx + radius * 0.5 * Math.cos(a), cy + radius * 0.5 * Math.sin(a), Math.max(1.5, radius * 0.38), 0, Math.PI * 2)
        ctx.fill()
      }

      // Lóbulos de follaje oscuros
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
      for (let i = 0; i < 5; i++) {
        const a = ((i * (360 / 5) + 36) * Math.PI) / 180
        ctx.beginPath()
        ctx.arc(cx + radius * 0.72 * Math.cos(a), cy + radius * 0.72 * Math.sin(a), Math.max(1.5, radius * 0.32), 0, Math.PI * 2)
        ctx.fill()
      }

      // Brillo cenital
      const canopyGlow = radialShade(ctx, cx - radius * 0.3, cy - radius * 0.3, 1, cx, cy, Math.max(2, radius), [
        [0, 'rgba(255, 255, 255, 0.28)'],
        [1, 'rgba(0, 0, 0, 0)']
      ])
      if (canopyGlow) {
        ctx.fillStyle = canopyGlow
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(3, radius * 0.94), 0, Math.PI * 2)
        ctx.fill()
      }

      // Tronco
      ctx.fillStyle = '#6b3f16'
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)'
      ctx.lineWidth = Math.max(1, 1 / scale)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1.5, radius * 0.16), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      break
    }

    case 'plant': {
      const cx = x + w / 2
      const cy = y + h / 2
      const radius = Math.min(w, h) / 2
      const line = Math.max(1, 1 / scale)

      // Sombra
      ctx.fillStyle = 'rgba(15, 23, 42, 0.16)'
      ctx.beginPath()
      ctx.arc(cx + radius * 0.1, cy + radius * 0.1, Math.max(2, radius * 0.9), 0, Math.PI * 2)
      ctx.fill()

      // Maceta
      ctx.fillStyle = '#b45309'
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.3 / scale)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(3, radius * 0.94), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.lineWidth = line
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, radius * 0.78), 0, Math.PI * 2)
      ctx.stroke()

      // Sustrato
      ctx.fillStyle = '#3f2a15'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, radius * 0.72), 0, Math.PI * 2)
      ctx.fill()

      // Hojas radiales
      const leaves = 8
      ctx.fillStyle = color
      for (let i = 0; i < leaves; i++) {
        const a = (i * (360 / leaves) * Math.PI) / 180
        ctx.beginPath()
        ctx.ellipse(cx + radius * 0.42 * Math.cos(a), cy + radius * 0.42 * Math.sin(a), Math.max(2, radius * 0.42), Math.max(1, radius * 0.24), a, 0, Math.PI * 2)
        ctx.fill()
      }

      // Sombreado alterno de las hojas (da volumen al follaje)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      for (let i = 0; i < leaves; i += 2) {
        const a = (i * (360 / leaves) * Math.PI) / 180
        ctx.beginPath()
        ctx.ellipse(cx + radius * 0.42 * Math.cos(a), cy + radius * 0.42 * Math.sin(a), Math.max(2, radius * 0.42), Math.max(1, radius * 0.24), a, 0, Math.PI * 2)
        ctx.fill()
      }

      // Botón central
      ctx.fillStyle = '#166534'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = line
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1.5, radius * 0.22), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      break
    }
  }

  ctx.restore()
}

/**
 * Dibuja una anotación individual o agrupada en el contexto de Canvas 2D.
 */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: CanvasAnnotation,
  isSelected: boolean = false,
  scale: number = 1,
  onImageLoaded?: () => void
) {
  ctx.save()

  const strokeColor = ann.strokeColor || '#ef4444'
  const strokeWidth = (ann.strokeWidth || 3) / scale
  const fillColor = ann.fillColor || 'rgba(239, 68, 68, 0.2)'
  const fillEnabled = ann.fillEnabled ?? false
  const rotation = ann.rotation || 0

  const box = getAnnotationBoundingBox(ann)
  const cx = box.minX + (box.maxX - box.minX) / 2
  const cy = box.minY + (box.maxY - box.minY) / 2

  // Transformación de rotación local si tiene ángulo
  if (rotation !== 0) {
    ctx.translate(cx, cy)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = Math.max(1 / scale, strokeWidth)
  ctx.fillStyle = fillColor

  if (ann.type === 'freehand' && ann.points && ann.points.length > 0) {
    ctx.beginPath()
    ctx.moveTo(ann.points[0].x, ann.points[0].y)
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x, ann.points[i].y)
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    if (fillEnabled && ann.points.length > 2) {
      ctx.closePath()
      ctx.fill()
    }
  } else if (ann.type === 'arrow') {
    const endX = ann.endX ?? ann.x + 50
    const endY = ann.endY ?? ann.y
    ctx.beginPath()
    ctx.moveTo(ann.x, ann.y)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Dibujar punta de flecha
    const angle = Math.atan2(endY - ann.y, endX - ann.x)
    const headLength = 14 / scale
    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fillStyle = strokeColor
    ctx.fill()
  } else if (ann.type === 'circle') {
    const radius = Math.max(5, (ann.width || 40) / 2)
    const centerX = ann.x + radius
    const centerY = ann.y + radius
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    if (fillEnabled) ctx.fill()
    ctx.stroke()
  } else if (ann.type === 'square' || ann.type === 'rectangle') {
    const w = ann.width || 60
    const h = ann.type === 'square' ? w : (ann.height || 40)
    ctx.beginPath()
    ctx.rect(ann.x, ann.y, w, h)
    if (fillEnabled) ctx.fill()
    ctx.stroke()
  } else if (ann.type === 'triangle') {
    const w = ann.width || 60
    const h = ann.height || 50
    ctx.beginPath()
    ctx.moveTo(ann.x + w / 2, ann.y)
    ctx.lineTo(ann.x + w, ann.y + h)
    ctx.lineTo(ann.x, ann.y + h)
    ctx.closePath()
    if (fillEnabled) ctx.fill()
    ctx.stroke()
  } else if (ann.type === 'text') {
    const fontSize = (ann.fontSize || 16) / scale
    const fontFamily = ann.fontFamily || 'sans-serif'
    const fontColor = ann.fontColor || strokeColor
    const textContent = ann.text || 'Texto'

    ctx.font = `bold ${fontSize}px ${fontFamily}`
    ctx.fillStyle = fontColor
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    const metrics = ctx.measureText(textContent)
    const textW = metrics.width
    const textH = fontSize * 1.2

    // Fondo semitransparente suave para legibilidad sobre planos
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    const pad = 4 / scale
    ctx.beginPath()
    ctx.roundRect(ann.x - pad, ann.y - pad, textW + pad * 2, textH + pad * 2, 3 / scale)
    ctx.fill()
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)'
    ctx.lineWidth = 1 / scale
    ctx.stroke()

    ctx.fillStyle = fontColor
    ctx.fillText(textContent, ann.x, ann.y)
  } else if (ann.type === 'image') {
    const w = ann.width || 120
    const h = ann.height || 90
    if (ann.imageUrl) {
      const img = getOrLoadImage(ann.imageUrl, onImageLoaded)
      if (img) {
        ctx.drawImage(img, ann.x, ann.y, w, h)
      } else {
        // Marcador de posición visual mientras carga la imagen
        ctx.fillStyle = 'rgba(241, 245, 249, 0.9)'
        ctx.fillRect(ann.x, ann.y, w, h)
        ctx.strokeStyle = '#94a3b8'
        ctx.lineWidth = 1.5 / scale
        ctx.strokeRect(ann.x, ann.y, w, h)
        ctx.fillStyle = '#64748b'
        ctx.font = `bold ${12 / scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Cargando Imagen...', ann.x + w / 2, ann.y + h / 2)
      }
    }
  } else if (ann.type === 'object') {
    drawTopDownObject(ctx, ann, scale)
  } else if (ann.type === 'group' && ann.children) {
    // Dibujar cada elemento hijo perteneciente al grupo
    ann.children.forEach(child => {
      drawAnnotation(ctx, child, false, scale, onImageLoaded)
    })
  }

  // Dibujar cuadro de selección, tiradores de redimensionamiento y tirador de rotación
  if (isSelected) {
    const margin = 6 / scale
    const minX = box.minX - margin
    const minY = box.minY - margin
    const maxX = box.maxX + margin
    const maxY = box.maxY + margin
    const width = maxX - minX
    const height = maxY - minY
    const midX = minX + width / 2
    const midY = minY + height / 2

    // Caja delimitadora discontinua (Azul primario para elementos simples, Violeta para Grupos)
    ctx.strokeStyle = ann.type === 'group' ? '#8b5cf6' : '#2563eb'
    ctx.lineWidth = 1.5 / scale
    ctx.setLineDash([4 / scale, 4 / scale])
    ctx.strokeRect(minX, minY, width, height)
    ctx.setLineDash([])

    // Tallo y tirador de rotación
    const rotateOffset = 24 / scale
    const rotateY = minY - rotateOffset
    ctx.beginPath()
    ctx.moveTo(midX, minY)
    ctx.lineTo(midX, rotateY)
    ctx.strokeStyle = ann.type === 'group' ? '#8b5cf6' : '#2563eb'
    ctx.lineWidth = 1.5 / scale
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(midX, rotateY, 6 / scale, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = ann.type === 'group' ? '#8b5cf6' : '#2563eb'
    ctx.lineWidth = 2 / scale
    ctx.stroke()

    // Indicador numérico del ángulo si está rotado
    if (rotation !== 0) {
      ctx.fillStyle = '#1e293b'
      ctx.font = `bold ${10 / scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${Math.round(rotation)}°`, midX, rotateY - 8 / scale)
    }

    // 8 Tiradores de escala
    const handles = [
      { x: minX, y: minY },   // nw
      { x: midX, y: minY },   // n
      { x: maxX, y: minY },   // ne
      { x: maxX, y: midY },   // e
      { x: maxX, y: maxY },   // se
      { x: midX, y: maxY },   // s
      { x: minX, y: maxY },   // sw
      { x: minX, y: midY },   // w
    ]

    const handleSize = 7 / scale
    handles.forEach(h => {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = ann.type === 'group' ? '#8b5cf6' : '#2563eb'
      ctx.lineWidth = 1.5 / scale
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize)
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize)
    })
  }

  ctx.restore()
}

/**
 * Calcula la caja delimitadora (Bounding Box) no rotada de una anotación en espacio de mundo.
 */
export function getAnnotationBoundingBox(ann: CanvasAnnotation): { minX: number; minY: number; maxX: number; maxY: number } {
  if (ann.type === 'group' && ann.children && ann.children.length > 0) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    ann.children.forEach(child => {
      const cBox = getAnnotationBoundingBox(child)
      if (cBox.minX < minX) minX = cBox.minX
      if (cBox.minY < minY) minY = cBox.minY
      if (cBox.maxX > maxX) maxX = cBox.maxX
      if (cBox.maxY > maxY) maxY = cBox.maxY
    })
    if (minX !== Infinity) {
      return { minX, minY, maxX, maxY }
    }
  }

  if (ann.type === 'freehand' && ann.points && ann.points.length > 0) {
    let minX = ann.points[0].x
    let minY = ann.points[0].y
    let maxX = ann.points[0].x
    let maxY = ann.points[0].y
    for (const p of ann.points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    return { minX, minY, maxX, maxY }
  }

  if (ann.type === 'arrow') {
    const endX = ann.endX ?? ann.x + 50
    const endY = ann.endY ?? ann.y
    return {
      minX: Math.min(ann.x, endX),
      minY: Math.min(ann.y, endY),
      maxX: Math.max(ann.x, endX),
      maxY: Math.max(ann.y, endY)
    }
  }

  if (ann.type === 'circle') {
    const w = ann.width || 40
    return {
      minX: ann.x,
      minY: ann.y,
      maxX: ann.x + w,
      maxY: ann.y + w
    }
  }

  if (ann.type === 'square' || ann.type === 'rectangle' || ann.type === 'triangle' || ann.type === 'image' || ann.type === 'object') {
    const w = ann.width || (ann.type === 'image' ? 120 : 60)
    const h = ann.type === 'square' ? w : (ann.height || (ann.type === 'image' ? 90 : 40))
    return {
      minX: ann.x,
      minY: ann.y,
      maxX: ann.x + w,
      maxY: ann.y + h
    }
  }

  if (ann.type === 'text') {
    const fontSize = ann.fontSize || 16
    const textLen = (ann.text || 'Texto').length
    const approxWidth = Math.max(40, textLen * (fontSize * 0.6))
    const approxHeight = fontSize * 1.2
    return {
      minX: ann.x,
      minY: ann.y,
      maxX: ann.x + approxWidth,
      maxY: ann.y + approxHeight
    }
  }

  return { minX: ann.x, minY: ann.y, maxX: ann.x + (ann.width || 40), maxY: ann.y + (ann.height || 40) }
}

/**
 * Retorna las coordenadas absolutas en espacio de mundo de todos los tiradores de una anotación.
 */
export function getAnnotationHandles(ann: CanvasAnnotation, scale: number = 1): Record<AnnotationHandleKey, { x: number; y: number }> {
  const box = getAnnotationBoundingBox(ann)
  const margin = 6 / scale
  const minX = box.minX - margin
  const minY = box.minY - margin
  const maxX = box.maxX + margin
  const maxY = box.maxY + margin
  const width = maxX - minX
  const height = maxY - minY
  const midX = minX + width / 2
  const midY = minY + height / 2

  const cx = box.minX + (box.maxX - box.minX) / 2
  const cy = box.minY + (box.maxY - box.minY) / 2
  const rotation = ann.rotation || 0

  const unrotatedHandles: Record<AnnotationHandleKey, { x: number; y: number }> = {
    nw: { x: minX, y: minY },
    n: { x: midX, y: minY },
    ne: { x: maxX, y: minY },
    e: { x: maxX, y: midY },
    se: { x: maxX, y: maxY },
    s: { x: midX, y: maxY },
    sw: { x: minX, y: maxY },
    w: { x: minX, y: midY },
    rotate: { x: midX, y: minY - 24 / scale }
  }

  if (rotation === 0) return unrotatedHandles

  const rotatedHandles = {} as Record<AnnotationHandleKey, { x: number; y: number }>
  for (const key in unrotatedHandles) {
    const k = key as AnnotationHandleKey
    rotatedHandles[k] = rotatePoint(unrotatedHandles[k].x, unrotatedHandles[k].y, cx, cy, rotation)
  }
  return rotatedHandles
}

/**
 * Detecta si un punto (wx, wy) en espacio de mundo colisiona con algún tirador de la anotación seleccionada.
 */
export function hitTestAnnotationHandles(wx: number, wy: number, ann: CanvasAnnotation, scale: number = 1): AnnotationHandleKey | null {
  const handles = getAnnotationHandles(ann, scale)
  const radius = 10 / scale // Tolerancia de clic para los tiradores

  for (const key in handles) {
    const k = key as AnnotationHandleKey
    const h = handles[k]
    const dist = Math.hypot(wx - h.x, wy - h.y)
    if (dist <= radius) return k
  }

  return null
}

/**
 * Verifica si un punto en espacio de mundo cae dentro de la anotación rotada o agrupada (hit testing).
 */
export function isPointInAnnotation(wx: number, wy: number, ann: CanvasAnnotation, tolerance: number = 8): boolean {
  const box = getAnnotationBoundingBox(ann)
  const cx = box.minX + (box.maxX - box.minX) / 2
  const cy = box.minY + (box.maxY - box.minY) / 2
  const rotation = ann.rotation || 0

  // Des-rotar el punto del puntero respecto al centro del elemento para evaluar contra la caja ortogonal
  const unrotated = unrotatePoint(wx, wy, cx, cy, rotation)

  if (ann.type === 'group' && ann.children && ann.children.length > 0) {
    return ann.children.some(child => isPointInAnnotation(unrotated.x, unrotated.y, child, tolerance))
  }

  return (
    unrotated.x >= box.minX - tolerance &&
    unrotated.x <= box.maxX + tolerance &&
    unrotated.y >= box.minY - tolerance &&
    unrotated.y <= box.maxY + tolerance
  )
}
