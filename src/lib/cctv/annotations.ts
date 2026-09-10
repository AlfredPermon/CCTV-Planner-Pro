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
 * Renderiza objetos vectoriales en vista superior (top-down view 2D)
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
    case 'car_sedan':
    case 'car_suv':
    case 'truck': {
      const isSuv = subtype === 'car_suv'
      const isTruck = subtype === 'truck'
      const cornerRadius = Math.min(w, h) * (isTruck ? 0.08 : 0.2)

      // Carrocería principal
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)

      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, cornerRadius)
      } else {
        ctx.rect(x, y, w, h)
      }
      ctx.fill()
      ctx.stroke()

      // Espejos retrovisores
      const mirrorW = Math.max(2, w * 0.06)
      const mirrorH = Math.max(3, h * 0.18)
      ctx.fillStyle = stroke
      ctx.fillRect(x + w * 0.3, y - mirrorH + 1, mirrorW, mirrorH)
      ctx.fillRect(x + w * 0.3, y + h - 1, mirrorW, mirrorH)

      // Faros delanteros (derecha si orientado horizontalmente hacia la derecha)
      ctx.fillStyle = '#fef08a'
      const lightH = h * 0.2
      ctx.fillRect(x + w - 2, y + h * 0.1, 2, lightH)
      ctx.fillRect(x + w - 2, y + h * 0.7, 2, lightH)

      // Faros traseros (rojos)
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(x, y + h * 0.1, 2, lightH)
      ctx.fillRect(x, y + h * 0.7, 2, lightH)

      // Parabrisas y Luneta (Cristal oscuro)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
      const windW = w * 0.22
      const windH = h * 0.76
      const windY = y + (h - windH) / 2

      // Parabrisas delantero
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x + w * 0.65, windY, windW, windH, [4, 2, 2, 4])
      } else {
        ctx.fillRect(x + w * 0.65, windY, windW, windH)
      }
      ctx.fill()

      // Luneta trasera
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x + w * 0.18, windY, windW * 0.8, windH, [2, 4, 4, 2])
      } else {
        ctx.fillRect(x + w * 0.18, windY, windW * 0.8, windH)
      }
      ctx.fill()

      // Techo / Carrocería superior
      if (isSuv) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1.5 / scale
        ctx.beginPath()
        ctx.moveTo(x + w * 0.25, y + h * 0.15)
        ctx.lineTo(x + w * 0.75, y + h * 0.15)
        ctx.moveTo(x + w * 0.25, y + h * 0.85)
        ctx.lineTo(x + w * 0.75, y + h * 0.85)
        ctx.stroke()
      } else if (isTruck) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.fillRect(x + w * 0.05, y + h * 0.1, w * 0.45, h * 0.8)
        ctx.strokeStyle = stroke
        ctx.strokeRect(x + w * 0.05, y + h * 0.1, w * 0.45, h * 0.8)
      }
      break
    }

    case 'person_man':
    case 'person_woman': {
      const isWoman = subtype === 'person_woman'
      const cx = x + w / 2
      const cy = y + h / 2

      const shoulderRx = w * 0.45
      const shoulderRy = h * 0.35

      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)

      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.max(2, shoulderRx), Math.max(2, shoulderRy), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (isWoman) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.beginPath()
        ctx.arc(cx - shoulderRx * 0.3, cy, Math.max(1, shoulderRy * 0.9), 0, Math.PI * 2)
        ctx.fill()
      }

      const headR = Math.min(w, h) * 0.28
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, headR), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#451a03'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1, headR * 0.75), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'desk': {
      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)

      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, 4 / scale)
      } else {
        ctx.rect(x, y, w, h)
      }
      ctx.fill()
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.lineWidth = 1 / scale
      ctx.strokeRect(x + 2 / scale, y + 2 / scale, Math.max(1, w - 4 / scale), Math.max(1, h - 4 / scale))

      ctx.fillStyle = '#64748b'
      ctx.beginPath()
      ctx.arc(x + w - 8 / scale, y + 8 / scale, Math.max(1, 3 / scale), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'office_chair': {
      const cx = x + w / 2
      const cy = y + h / 2
      const radius = Math.min(w, h) / 2

      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 2 / scale)
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 * Math.PI) / 180
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + (radius * 0.9) * Math.cos(angle), cy + (radius * 0.9) * Math.sin(angle))
        ctx.stroke()
      }

      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, radius * 0.65), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = stroke
      ctx.beginPath()
      ctx.arc(cx, cy + radius * 0.15, Math.max(2, radius * 0.7), Math.PI * 0.85, Math.PI * 0.15, true)
      ctx.fill()
      break
    }

    case 'computer': {
      const monitorW = w * 0.85
      const monitorH = Math.max(3, h * 0.18)
      const monitorX = x + (w - monitorW) / 2
      const monitorY = y + h * 0.15

      ctx.fillStyle = '#64748b'
      ctx.fillRect(x + w * 0.4, y + h * 0.35, w * 0.2, h * 0.2)

      ctx.fillStyle = '#0f172a'
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)
      ctx.fillRect(monitorX, monitorY, monitorW, monitorH)
      ctx.strokeRect(monitorX, monitorY, monitorW, monitorH)

      const kbdW = w * 0.65
      const kbdH = Math.max(3, h * 0.3)
      const kbdX = x + (w - kbdW) / 2
      const kbdY = y + h * 0.6

      ctx.fillStyle = color
      ctx.fillRect(kbdX, kbdY, kbdW, kbdH)
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1 / scale
      ctx.strokeRect(kbdX, kbdY, kbdW, kbdH)
      break
    }

    case 'tree': {
      const cx = x + w / 2
      const cy = y + h / 2
      const radius = Math.min(w, h) / 2

      ctx.fillStyle = color
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)

      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(3, radius * 0.85), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const numLobes = 6
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      for (let i = 0; i < numLobes; i++) {
        const angle = (i * (360 / numLobes) * Math.PI) / 180
        const lx = cx + radius * 0.55 * Math.cos(angle)
        const ly = cy + radius * 0.55 * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(lx, ly, Math.max(2, radius * 0.4), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.lineWidth = Math.max(1, 1 / scale)
      for (let i = 0; i < 4; i++) {
        const angle = ((i * 90 + 25) * Math.PI) / 180
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + radius * 0.65 * Math.cos(angle), cy + radius * 0.65 * Math.sin(angle))
        ctx.stroke()
      }

      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1.5, radius * 0.18), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'plant': {
      const cx = x + w / 2
      const cy = y + h / 2
      const radius = Math.min(w, h) / 2

      ctx.fillStyle = '#9a3412'
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, 1.5 / scale)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(3, radius * 0.9), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const leaves = 7
      ctx.fillStyle = color
      for (let i = 0; i < leaves; i++) {
        const angle = (i * (360 / leaves) * Math.PI) / 180
        const lx = cx + radius * 0.45 * Math.cos(angle)
        const ly = cy + radius * 0.45 * Math.sin(angle)
        ctx.beginPath()
        ctx.ellipse(lx, ly, Math.max(2, radius * 0.4), Math.max(1, radius * 0.22), angle, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#451a03'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1, radius * 0.2), 0, Math.PI * 2)
      ctx.fill()
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
