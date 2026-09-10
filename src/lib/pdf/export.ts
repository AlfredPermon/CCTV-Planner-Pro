import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { buildAccessExportGroups, getAccessDetailPageCount, ACCESS_GROUPS_PER_PAGE, ACCESS_GROUP_SIZE } from './accessExportGrouping'
import { validateExportProject, validateFloorPlanAspect, type ValidationResult } from './exportValidation'
import {
  DEFAULT_ACCESS_LABEL_BG_COLOR,
  DEFAULT_ACCESS_LABEL_BORDER_COLOR,
  DEFAULT_ACCESS_LABEL_OUTLINE_COLOR,
  computeAccessExportLabelFontSize,
  computeAccessExportLabelOffsetY,
  estimateAccessLabelWidth,
  resolveAccessLabelFontColor,
  resolveAccessLabelFontFamily,
} from '@/lib/access/device'
import {
  applySpatialTransform,
  computeRenderLayout,
  computeUniformTransform,
  EXPORT_BASE_H,
  EXPORT_BASE_W,
  getFloorPlanForMode,
  type RenderDesignMode,
} from './exportSpatial'
import { drawVoceoIcon, getVoceoColor } from '@/lib/voceo/iconRegistry'
import { drawFireIcon, getFireColor } from '@/lib/incendio/iconRegistry'
import { drawCameraCoverage, CAMERA_TYPE_COLORS } from '@/lib/cctv/coverageRenderer'
import type { Camera } from '@/lib/cctv/types'

export type PdfFormat =
  | 'a4'
  | 'letter'
  | 'legal'
  | 'tabloid'
  | 'a3'
  | 'b4'

export interface PdfOptions {
  orientation: 'portrait' | 'landscape'
  format: PdfFormat
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  imageQuality: number
  scale?: number
  title?: string
  subject?: string
  author?: string
  companyName?: string
  projectTitle?: string
  logoDataUrl?: string
  description?: string
  version?: string
  aiAnalysis?: any
  coverEnabled?: boolean
  coverTheme?: 'color' | 'bw'
  coverPrimaryColor?: string
  coverSecondaryColor?: string
  coverBgColor?: string
  coverFont?: string
}

function mmToPt(mm: number) {
  return (mm * 72) / 25.4
}

function ptToPx(pt: number, dpi = 96) {
  return (pt / 72) * dpi
}

function mmToPx(mm: number, dpi: number) {
  return Math.round((mm / 25.4) * dpi)
}
export { computeUniformTransform }

function drawAppLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, theme: 'color' | 'bw') {
  const s = size
  const r = s / 2

  ctx.save()
  ctx.translate(cx, cy)

  // 1. Fondo Circular con Gradiente Vibrante
  if (theme === 'color') {
    const grad = ctx.createLinearGradient(-r, -r, r, r)
    // Azul cian brillante (#00aaff) a Magenta/Rojo vibrante (#ff0055)
    grad.addColorStop(0, '#0ea5e9') // sky-500
    grad.addColorStop(0.5, '#3b82f6') // blue-500
    grad.addColorStop(1, '#ec4899') // pink-500
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = '#111111'
  }
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  // 2. Icono de Cámara (Lineal / Outline)
  const iconScale = s * 0.5 // Tamaño relativo del icono
  const lw = s * 0.035 // Grosor de línea
  
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Ajuste de posición para centrar visualmente el icono inclinado
  ctx.translate(-iconScale * 0.1, iconScale * 0.05)

  // -- Base de Pared (Izquierda) --
  ctx.beginPath()
  // Placa vertical
  ctx.moveTo(-iconScale * 0.8, -iconScale * 0.3)
  ctx.lineTo(-iconScale * 0.8, iconScale * 0.5)
  // Cuerpo base
  ctx.moveTo(-iconScale * 0.8, -iconScale * 0.1)
  ctx.lineTo(-iconScale * 0.6, -iconScale * 0.1)
  ctx.lineTo(-iconScale * 0.6, iconScale * 0.3)
  ctx.lineTo(-iconScale * 0.8, iconScale * 0.3)
  ctx.stroke()

  // -- Brazo Articulado --
  ctx.beginPath()
  // Eje circular
  ctx.arc(-iconScale * 0.35, iconScale * 0.3, iconScale * 0.12, 0, Math.PI * 2)
  // Conector a cámara
  ctx.moveTo(-iconScale * 0.35, iconScale * 0.18)
  ctx.lineTo(-iconScale * 0.25, -iconScale * 0.05)
  ctx.stroke()

  // -- Cuerpo de Cámara (Inclinado) --
  ctx.save()
  // Rotación ligera para dar dinamismo (~15 grados hacia abajo)
  ctx.rotate(15 * Math.PI / 180)
  ctx.translate(-iconScale * 0.1, -iconScale * 0.2)

  ctx.beginPath()
  // Caja principal
  const bodyW = iconScale * 1.0
  const bodyH = iconScale * 0.5
  const bodyX = -bodyW / 4
  const bodyY = -bodyH / 2
  
  // Forma trapezoidal estilizada
  ctx.moveTo(bodyX, bodyY) // Top-left
  ctx.lineTo(bodyX + bodyW, bodyY) // Top-right (largo)
  ctx.lineTo(bodyX + bodyW * 0.9, bodyY + bodyH) // Bottom-right
  ctx.lineTo(bodyX + bodyW * 0.1, bodyY + bodyH) // Bottom-left
  ctx.closePath()

  // Visera (Techo)
  ctx.moveTo(bodyX - bodyW * 0.1, bodyY)
  ctx.lineTo(bodyX + bodyW * 1.1, bodyY)
  
  // Lente (Frente)
  ctx.moveTo(bodyX + bodyW * 0.9, bodyY + bodyH * 0.1)
  ctx.lineTo(bodyX + bodyW * 0.9 + bodyH * 0.3, bodyY + bodyH * 0.2)
  ctx.lineTo(bodyX + bodyW * 0.9 + bodyH * 0.3, bodyY + bodyH * 0.8)
  ctx.lineTo(bodyX + bodyW * 0.85, bodyY + bodyH * 0.9)

  // Detalles internos (líneas de ventilación/diseño)
  ctx.moveTo(bodyX + bodyW * 0.3, bodyY + bodyH * 0.3)
  ctx.lineTo(bodyX + bodyW * 0.7, bodyY + bodyH * 0.3)
  
  ctx.moveTo(bodyX + bodyW * 0.3, bodyY + bodyH * 0.6)
  ctx.lineTo(bodyX + bodyW * 0.6, bodyY + bodyH * 0.6)

  // Círculos pequeños (LEDs IR)
  ctx.moveTo(bodyX + bodyW * 0.2 + lw, bodyY + bodyH * 0.45)
  ctx.arc(bodyX + bodyW * 0.2, bodyY + bodyH * 0.45, lw * 0.8, 0, Math.PI * 2)

  ctx.stroke()
  ctx.restore()

  ctx.restore()
}

export async function renderCoverCanvas(
  project: ExportProjectData,
  options: PdfOptions,
  filename: string,
  theme: 'color' | 'bw' = 'color',
  dpi = 300,
  toc?: Array<{ title: string; page: number | string }>,
  targetPtW?: number,
  targetPtH?: number
) {
  // Use target sizes if provided, otherwise default to A4 portrait
  const isLandscape = options.orientation === 'landscape'
  const defaultW_mm = isLandscape ? 297 : 210
  const defaultH_mm = isLandscape ? 210 : 297
  
  const widthPx = targetPtW ? Math.round(ptToPx(targetPtW, dpi)) : mmToPx(defaultW_mm, dpi)
  const heightPx = targetPtH ? Math.round(ptToPx(targetPtH, dpi)) : mmToPx(defaultH_mm, dpi)
  
  // Scale margin proportionally, based on smaller dimension
  const minDim = Math.min(widthPx, heightPx)
  const marginPx = Math.round(minDim * 0.095) // roughly 20mm on A4 width

  const c = createCanvas(widthPx, heightPx)
  const ctx = c.getContext('2d')!
  // background
  ctx.fillStyle = options.coverBgColor || '#ffffff'
  ctx.fillRect(0, 0, widthPx, heightPx)
  // palette
  const headColor = options.coverPrimaryColor || (theme === 'bw' ? '#000000' : '#0f172a')
  const subColor = options.coverSecondaryColor || (theme === 'bw' ? '#333333' : '#334155')
  const lightSep = theme === 'bw' ? '#cccccc' : '#e5e7eb'
  const fontFamily = options.coverFont || 'Helvetica, Arial, sans-serif'
  // safe area
  const left = marginPx
  const right = widthPx - marginPx
  const top = marginPx
  const bottom = heightPx - marginPx
  // separator line
  ctx.strokeStyle = lightSep
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(left, top + Math.round((bottom - top) * 0.18))
  ctx.lineTo(right, top + Math.round((bottom - top) * 0.18))
  ctx.stroke()
  // title
  const title = options.projectTitle || options.title || 'Proyecto de Seguridad'
  ctx.fillStyle = headColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `${Math.round(minDim * 0.04)}px ${fontFamily}`
  ctx.fillText(title, widthPx / 2, top + Math.round((bottom - top) * 0.12))
  // company
  const company = project.companyName || options.companyName || 'Compañía'
  ctx.fillStyle = subColor
  ctx.font = `${Math.round(minDim * 0.022)}px ${fontFamily}`
  ctx.fillText(company, widthPx / 2, top + Math.round((bottom - top) * 0.155))
  // author
  const author = project.author || options.author || ''
  if (author) {
    ctx.font = `${Math.round(minDim * 0.018)}px ${fontFamily}`
    ctx.fillText(author, widthPx / 2, top + Math.round((bottom - top) * 0.19))
  }
  // 3. Logo in Top-Left (if provided)
  if (options.logoDataUrl) {
    try {
      const im = new Image()
      await new Promise<void>((res) => {
        im.onload = () => res()
        im.onerror = () => res()
        im.src = options.logoDataUrl!
      })
      const aspect = (im.naturalWidth || im.width || 1) / Math.max(1, (im.naturalHeight || im.height || 1))
      let logoW = Math.round(minDim * 0.15)
      let logoH = logoW / aspect
      ctx.drawImage(im, left, top, logoW, logoH)
    } catch {}
  }

  // centered app logo + app name
  const centerY = top + Math.round((bottom - top) * 0.5)
  drawAppLogo(ctx, widthPx / 2, centerY, Math.round(minDim * 0.25), theme)
  ctx.fillStyle = headColor
  ctx.font = `${Math.round(minDim * 0.028)}px ${fontFamily}`
  ctx.fillText('CCTV Planner Pro', widthPx / 2, centerY + Math.round(minDim * 0.18))
  // datetime
  const nowStr = formatDateTime(new Date()).replace(' ', ' - ')
  ctx.fillStyle = subColor
  ctx.font = `${Math.round(minDim * 0.016)}px ${fontFamily}`
  ctx.fillText(nowStr, widthPx / 2, bottom - Math.round(minDim * 0.06))
  // filename bottom-right
  const small = `${Math.round(minDim * 0.014)}px ${fontFamily}`
  ctx.font = small
  ctx.textAlign = 'right'
  ctx.fillText(filename, right, bottom)
  // Table of Contents
  if (toc && toc.length > 0) {
    ctx.textAlign = 'left'
    ctx.fillStyle = headColor
    ctx.font = `${Math.round(minDim * 0.02)}px ${fontFamily}`
    const tocTitleY = top + Math.round((bottom - top) * 0.26)
    ctx.fillText('Contenido', left, tocTitleY)
    ctx.strokeStyle = lightSep
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left, tocTitleY + 6)
    ctx.lineTo(right, tocTitleY + 6)
    ctx.stroke()
    const lineH = Math.round(minDim * 0.018)
    ctx.font = `${Math.round(minDim * 0.016)}px ${fontFamily}`
    let y = tocTitleY + lineH + 10
    toc.forEach(item => {
      const label = item.title
      const pageStr = String(item.page)
      ctx.fillStyle = subColor
      ctx.fillText(label, left, y)
      ctx.textAlign = 'right'
      ctx.fillText(pageStr, right, y)
      ctx.textAlign = 'left'
      y += lineH + 6
    })
  }
  return c
}

async function addCoverPageToDoc(
  doc: jsPDF,
  project: ExportProjectData,
  options: PdfOptions,
  filename: string,
  toc?: Array<{ title: string; page: number | string }>
) {
  if (options.coverEnabled === false) return true
  try {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const theme = options.coverTheme || 'color'
    const canvas = await renderCoverCanvas(project, options, filename, theme, 300, toc, pageW, pageH)
    const img = canvas.toDataURL('image/jpeg', options.imageQuality)
    doc.addImage(img, 'JPEG', 0, 0, pageW, pageH)
    doc.addPage()
    return true
  } catch {
    return false
  }
}

export async function exportCoverPdf(
  project: ExportProjectData,
  options: PdfOptions,
  filename: string,
  theme: 'color' | 'bw' = 'color'
) {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    format: options.format || 'a4',
    unit: 'pt',
    hotfixes: ['px_scaling'],
  })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const canvas = await renderCoverCanvas(project, { ...options, coverTheme: theme, coverEnabled: true }, filename, theme, 300, undefined, pageW, pageH)
  const img = canvas.toDataURL('image/jpeg', options.imageQuality)
  doc.addImage(img, 'JPEG', 0, 0, pageW, pageH)
  doc.save(filename)
}

export async function exportCoverPng(
  project: ExportProjectData,
  options: PdfOptions,
  filename: string,
  theme: 'color' | 'bw' = 'color'
) {
  const canvas = await renderCoverCanvas(project, { ...options, coverTheme: theme, coverEnabled: true }, filename, theme, 300)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.replace(/\.pdf$/i, '.png')
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export function exportCoverSvg(
  project: ExportProjectData,
  options: PdfOptions,
  filename: string,
  theme: 'color' | 'bw' = 'color'
) {
  // Simple editable SVG approximation (texts and minimal shapes)
  const isLandscape = options.orientation === 'landscape'
  const w_mm = isLandscape ? 297 : 210
  const h_mm = isLandscape ? 210 : 297
  const cx = w_mm / 2
  const cy = h_mm / 2

  const headColor = theme === 'bw' ? '#000000' : '#0f172a'
  const subColor = theme === 'bw' ? '#333333' : '#334155'
  const bodyColor = theme === 'bw' ? '#111111' : '#1d4ed8'
  const lensColor = theme === 'bw' ? '#000000' : '#0f172a'
  const accent = theme === 'bw' ? '#000000' : '#3b82f6'
  const title = options.projectTitle || options.title || 'Proyecto de Seguridad'
  const company = project.companyName || options.companyName || 'Compañía'
  const author = project.author || options.author || ''
  const nowStr = formatDateTime(new Date()).replace(' ', ' - ')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w_mm}mm" height="${h_mm}mm" viewBox="0 0 ${w_mm} ${h_mm}">
  <rect x="0" y="0" width="${w_mm}" height="${h_mm}" fill="#ffffff"/>
  <line x1="20" y1="${h_mm * 0.25}" x2="${w_mm - 20}" y2="${h_mm * 0.25}" stroke="#e5e7eb" stroke-width="0.6"/>
  <text x="${cx}" y="${h_mm * 0.2}" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="${headColor}" text-anchor="middle">${title}</text>
  <text x="${cx}" y="${h_mm * 0.23}" font-family="Helvetica, Arial, sans-serif" font-size="6" fill="${subColor}" text-anchor="middle">${company}</text>
  ${author ? `<text x="${cx}" y="${h_mm * 0.25}" font-family="Helvetica, Arial, sans-serif" font-size="5" fill="${subColor}" text-anchor="middle">${author}</text>` : ''}
  <!-- App logo -->
  <g transform="translate(${cx},${h_mm * 0.5})">
    <rect x="-26" y="-16" rx="4" ry="4" width="52" height="32" fill="${bodyColor}"/>
    <circle cx="0" cy="0" r="9" fill="#ffffff"/>
    <circle cx="0" cy="0" r="6" fill="${lensColor}"/>
    <circle cx="-17" cy="-6" r="2" fill="${accent}"/>
  </g>
  <text x="${cx}" y="${h_mm * 0.62}" font-family="Helvetica, Arial, sans-serif" font-size="6.5" fill="${headColor}" text-anchor="middle">CCTV Planner Pro</text>
  <text x="${cx}" y="${h_mm * 0.92}" font-family="Helvetica, Arial, sans-serif" font-size="4.2" fill="${subColor}" text-anchor="middle">${nowStr}</text>
  <text x="${w_mm - 20}" y="${h_mm * 0.97}" font-family="Helvetica, Arial, sans-serif" font-size="3.8" fill="${subColor}" text-anchor="end">${filename}</text>
</svg>`
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.pdf$/i, '.svg')
  a.click()
  URL.revokeObjectURL(url)
}
export async function generatePdfFromSelectors(
  selectors: string[],
  options: PdfOptions
) {
  const doc = new jsPDF({
    orientation: options.orientation,
    format: options.format,
    unit: 'pt',
    hotfixes: ['px_scaling'],
  })

  doc.setProperties({
    title: options.title || 'Documento',
    subject: options.subject || '',
    author: options.author || '',
    creator: options.companyName || 'Exportador PDF',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const margin = {
    top: options.marginTop,
    right: options.marginRight,
    bottom: options.marginBottom,
    left: options.marginLeft,
  }

  const headerHeightPt = options.title || options.logoDataUrl || options.companyName || options.projectTitle ? mmToPt(22) : 0
  const centerCompany = options.companyName || ''
  const centerTitle = options.projectTitle || options.title || ''
  let cursorY = margin.top + headerHeightPt

  if (headerHeightPt > 0) {
    if (options.logoDataUrl) {
      const logoWidthPt = mmToPt(30)
      const logoHeightPt = mmToPt(12)
      doc.addImage(
        options.logoDataUrl,
        'PNG',
        margin.left,
        margin.top,
        logoWidthPt,
        logoHeightPt
      )
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const companyWidth = doc.getTextWidth(centerCompany)
    doc.text(centerCompany, (pageWidth - companyWidth) / 2, margin.top + mmToPt(6))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const titleWidth = doc.getTextWidth(centerTitle)
    doc.text(centerTitle, (pageWidth - titleWidth) / 2, margin.top + mmToPt(12))

    doc.setLineWidth(0.5)
    doc.line(margin.left, margin.top + headerHeightPt, pageWidth - margin.right, margin.top + headerHeightPt)
  }

  const today = new Date()
  const dateTimeStr = formatDateTime(today)
  let currentPage = 1

  for (let i = 0; i < selectors.length; i++) {
    const el = document.querySelector(selectors[i]) as HTMLElement | null
    if (!el) continue

    const scale =
      options.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // Add CSS fix for lab colors if needed
    const canvas = await html2canvas(el, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      onclone: (clonedDoc) => {
         const clonedEl = clonedDoc.querySelector(selectors[i]) as HTMLElement
         if (clonedEl) {
            const getComputedColor = (el: Element, prop: string) => {
              const val = window.getComputedStyle(el).getPropertyValue(prop)
              if (val.match(/^(lab|lch|oklch|color)/)) {
                  const temp = document.createElement('div')
                  temp.style.color = val
                  document.body.appendChild(temp)
                  const rgb = window.getComputedStyle(temp).color
                  document.body.removeChild(temp)
                  return rgb
              }
              return val
            }

            clonedEl.style.backgroundColor = getComputedColor(el, 'background-color')

            const allElements = clonedEl.querySelectorAll('*')
            allElements.forEach((e, idx) => {
               const style = (e as HTMLElement).style
               const computed = window.getComputedStyle(e)

               style.color = getComputedColor(e, 'color')
               style.backgroundColor = getComputedColor(e, 'background-color')
               style.borderTopColor = getComputedColor(e, 'border-top-color')
               style.borderRightColor = getComputedColor(e, 'border-right-color')
               style.borderBottomColor = getComputedColor(e, 'border-bottom-color')
               style.borderLeftColor = getComputedColor(e, 'border-left-color')
               if (computed.backgroundImage.includes('lab(') || computed.backgroundImage.includes('lch(') || computed.backgroundImage.includes('oklch(') || computed.backgroundImage.includes('color(')) {
                 style.backgroundImage = 'none'
               }
               if (computed.boxShadow.includes('lab(') || computed.boxShadow.includes('lch(') || computed.boxShadow.includes('oklch(') || computed.boxShadow.includes('color(')) {
                 style.boxShadow = 'none'
               }
            })
         }
      },
    })

    const imgData = canvas.toDataURL('image/jpeg', options.imageQuality)
    const imgWidthPx = canvas.width
    const imgHeightPx = canvas.height

    const availableWidthPt = pageWidth - margin.left - margin.right
    const availableHeightPt = pageHeight - cursorY - margin.bottom

    const imgWidthPt = (imgWidthPx / ptToPx(72)) * 72
    const imgHeightPt = (imgHeightPx / ptToPx(72)) * 72

    const widthRatio = availableWidthPt / imgWidthPt
    const heightRatio = availableHeightPt / imgHeightPt
    const ratio = Math.min(widthRatio, heightRatio)

    const renderWidthPt = imgWidthPt * ratio
    const renderHeightPt = imgHeightPt * ratio

    if (renderHeightPt > availableHeightPt) {
      doc.addPage()
      cursorY = margin.top
    }

    doc.addImage(
      imgData,
      'JPEG',
      margin.left + (availableWidthPt - renderWidthPt) / 2,
      cursorY,
      renderWidthPt,
      renderHeightPt
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const leftY = pageHeight - margin.bottom - mmToPt(8)
    const docTitle = options.title || options.projectTitle || 'Documento'
    doc.text(options.author || '', margin.left, leftY)
    doc.text(docTitle, margin.left, leftY + mmToPt(5))
    const rightText = `${dateTimeStr} • Página ${currentPage}`
    const tw = doc.getTextWidth(rightText)
    doc.text(rightText, pageWidth - margin.right - tw, pageHeight - margin.bottom)

    cursorY += renderHeightPt + mmToPt(4)

    if (i < selectors.length - 1) {
      if (cursorY + mmToPt(10) > pageHeight - margin.bottom) {
        doc.addPage()
        currentPage++
        cursorY = margin.top + headerHeightPt
        if (headerHeightPt > 0) {
          if (options.logoDataUrl) {
            const logoWidthPt = mmToPt(30)
            const logoHeightPt = mmToPt(12)
            doc.addImage(options.logoDataUrl, 'PNG', margin.left, margin.top, logoWidthPt, logoHeightPt)
          }
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(14)
          const companyWidth2 = doc.getTextWidth(centerCompany)
          doc.text(centerCompany, (pageWidth - companyWidth2) / 2, margin.top + mmToPt(6))
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(12)
          const titleWidth2 = doc.getTextWidth(centerTitle)
          doc.text(centerTitle, (pageWidth - titleWidth2) / 2, margin.top + mmToPt(12))
          doc.setLineWidth(0.5)
          doc.line(margin.left, margin.top + headerHeightPt, pageWidth - margin.right, margin.top + headerHeightPt)
        }
      }
    }
  }

  const blob = doc.output('blob')
  return { blob, doc }
}

export async function generatePreviewUrl(
  selectors: string[],
  options: PdfOptions
) {
  const { blob } = await generatePdfFromSelectors(selectors, options)
  const url = URL.createObjectURL(blob)
  return url
}

export async function downloadPdf(
  selectors: string[],
  options: PdfOptions,
  filename: string
) {
  const { doc } = await generatePdfFromSelectors(selectors, options)
  doc.save(filename)
}

async function createPdfPreviewUrlFromDoc(doc: jsPDF) {
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

export interface ExportProjectData {
  floorPlan: {
    url: string
    width: number
    height: number
    scaleMetersPerPixel?: number
  } | null
  floorPlanAccess?: {
    url: string
    width: number
    height: number
    scaleMetersPerPixel?: number
  } | null
  floorPlanVoceo?: {
    url: string
    width: number
    height: number
    scaleMetersPerPixel?: number
  } | null
  floorPlanFire?: {
    url: string
    width: number
    height: number
    scaleMetersPerPixel?: number
  } | null
  floorPlanParking?: {
    url: string
    width: number
    height: number
    scaleMetersPerPixel?: number
  } | null
  cameras: Array<{
    id: string
    name: string
    type: string
    iconKey?: string
    x: number
    y: number
    rotation: number
    fov: number
    resolution: string
    labelOffsetX?: number
    labelOffsetY?: number
  }>
  accessDevices?: Array<{
    id: string
    type: 'terminal' | 'lock' | 'exit_button' | string
    iconKey?: string
    name: string
    labelVisible?: boolean
    fontSize?: number
    fontFamily?: string
    x: number
    y: number
    rotation: number
    labelOffsetX?: number
    labelOffsetY?: number
  }>
  voceoDevices?: Array<{
    id: string
    type: 'speaker' | 'horn' | 'panel' | string
    iconKey?: string
    name: string
    x: number
    y: number
    rotation: number
    labelOffsetX?: number
    labelOffsetY?: number
  }>
  fireDevices?: Array<{
    id: string
    type: 'panel' | 'smoke_detector' | 'smoke_heat_detector' | 'heat_detector' | 'manual_station' | 'explosion_proof_station' | 'horn_strobe' | 'led_indicator' | 'module' | 'base' | string
    iconKey?: string
    name: string
    x: number
    y: number
    rotation: number
    labelOffsetX?: number
    labelOffsetY?: number
  }>
  parkingDevices?: Array<{
    id: string
    type: 'barrier_left' | 'barrier_right' | 'barrier' | 'uhf_reader' | 'tag' | 'magnetic_loop' | 'parking_meter' | 'generic' | string
    iconKey?: string
    name: string
    x: number
    y: number
    rotation: number
    labelOffsetX?: number
    labelOffsetY?: number
    labelFontSize?: number
    paymentMethod?: string
    communication?: string
    municipalId?: string
  }>
  iconScales?: Record<string, number>
  companyName?: string
  author?: string
  projectTitle?: string
  version?: string
  logoDataUrl?: string
  cameraDescriptions?: Record<string, string>
  hideFovLines?: boolean
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatDateTime(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function createCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function applySharpen(base: HTMLCanvasElement, amount = 0.6) {
  const ctx = base.getContext('2d')
  if (!ctx) return base
  const src = ctx.getImageData(0, 0, base.width, base.height)
  const tmp = document.createElement('canvas')
  tmp.width = base.width
  tmp.height = base.height
  const tctx = tmp.getContext('2d')
  if (!tctx) return base
  tctx.putImageData(src, 0, 0)
  const blur = tctx.getImageData(0, 0, base.width, base.height)
  const out = ctx.createImageData(base.width, base.height)
  const s = src.data
  const b = blur.data
  const o = out.data
  for (let i = 0; i < s.length; i += 4) {
    o[i] = Math.min(255, Math.max(0, s[i] + amount * (s[i] - b[i])))
    o[i + 1] = Math.min(255, Math.max(0, s[i + 1] + amount * (s[i + 1] - b[i + 1])))
    o[i + 2] = Math.min(255, Math.max(0, s[i + 2] + amount * (s[i + 2] - b[i + 2])))
    o[i + 3] = s[i + 3]
  }
  ctx.putImageData(out, 0, 0)
  return base
}

function countDevicesForMode(
  data: ExportProjectData,
  mode: 'all' | 'cams' | 'devices' | 'access' | 'voceo' | 'fire' | 'parking'
) {
  let count = 0
  if (mode === 'all' || mode === 'cams') count += data.cameras.length
  if (mode === 'all' || mode === 'devices' || mode === 'access') count += data.accessDevices?.length ?? 0
  if (mode === 'all' || mode === 'voceo') count += data.voceoDevices?.length ?? 0
  if (mode === 'all' || mode === 'fire') count += data.fireDevices?.length ?? 0
  if (mode === 'all' || mode === 'parking') count += data.parkingDevices?.length ?? 0
  return count
}

function emptyStateMessageForMode(
  mode: 'all' | 'cams' | 'devices' | 'access' | 'voceo' | 'fire' | 'parking'
) {
  switch (mode) {
    case 'cams':
      return 'No hay cámaras sembradas en el plano'
    case 'access':
    case 'devices':
      return 'No hay dispositivos de control de acceso sembrados en el plano'
    case 'voceo':
      return 'No hay dispositivos de voceo sembrados en el plano'
    case 'fire':
      return 'No hay dispositivos contra incendios sembrados en el plano'
    case 'parking':
      return 'No hay dispositivos de parking sembrados en el plano'
    default:
      return 'No hay dispositivos sembrados en el plano'
  }
}

function drawEmptyStateOverlay(
  ctx: any,
  data: ExportProjectData,
  floorPlan: ExportProjectData['floorPlan'],
  mode: 'all' | 'cams' | 'devices' | 'access' | 'voceo' | 'fire' | 'parking',
  s: number,
  offsetX: number,
  offsetY: number,
  targetW: number,
  targetH: number,
  baseW: number,
  baseH: number
) {
  if (floorPlan) return
  if (countDevicesForMode(data, mode) > 0) return
  const centerX = offsetX + (baseW / 2) * s
  const centerY = offsetY + (baseH / 2) * s
  const boxW = Math.min(560, targetW * 0.7)
  const boxH = 90
  ctx.save()
  ctx.fillStyle = '#f1f5f9'
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(1, 1.5 * s)
  const bx = centerX - boxW / 2
  const by = centerY - boxH / 2
  ctx.beginPath()
  ctx.roundRect(bx, by, boxW, boxH, 12)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#475569'
  ctx.font = `bold ${Math.round(18 * Math.max(1, s * 0.6))}px Helvetica, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emptyStateMessageForMode(mode), centerX, centerY)
  ctx.restore()
}

export async function renderDesignCanvas(
  data: ExportProjectData,
  targetW: number,
  targetH: number,
  mode: RenderDesignMode = 'all',
  zoomLevel: number = 1
) {
  const c = createCanvas(targetW, targetH)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetW, targetH)
  const layout = computeRenderLayout(data, targetW, targetH, mode)
  const { transform, floorPlan, floorPlanBounds } = layout
  const { baseW, baseH, scale: s, offsetX, offsetY } = transform
  if (floorPlan && floorPlanBounds) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = floorPlan.url
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => res()
    })
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, floorPlanBounds.x, floorPlanBounds.y, floorPlanBounds.w, floorPlanBounds.h)
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = Math.max(1, 2 * s)
    ctx.strokeRect(floorPlanBounds.x, floorPlanBounds.y, floorPlanBounds.w, floorPlanBounds.h)
  }
  // Render devices even when no floor plan is available so that
  // "seeded" markers remain visible in the PDF regardless of background state.
  if (mode === 'all' || mode === 'cams') {
    data.cameras.forEach(cam => {
      const cx = offsetX + cam.x * s
      const cy = offsetY + cam.y * s
      const iconScale = data.iconScales?.[cam.id] ?? 1
      const cameraType = (cam.type as Camera['type']) || 'dome'
      const typeColors = CAMERA_TYPE_COLORS[cameraType] || CAMERA_TYPE_COLORS.dome

      const effectiveMetersPerPixel = floorPlan?.scaleMetersPerPixel && floorPlan.scaleMetersPerPixel > 0
        ? floorPlan.scaleMetersPerPixel
        : 0.05

      const fullCam: Camera = {
        id: cam.id,
        type: cameraType,
        name: cam.name,
        x: 0,
        y: 0,
        rotation: cam.rotation,
        fov: cam.fov || 90,
        resolution: cam.resolution || '1080p',
        bitrate: (cam as any).bitrate || 2048,
        fps: (cam as any).fps || 30,
        focalLength: (cam as any).focalLength,
        sensorFormat: (cam as any).sensorFormat,
        sensorWidth: (cam as any).sensorWidth,
        horizontalRes: (cam as any).horizontalRes,
        coverageColors: (cam as any).coverageColors,
        coverageOpacity: (cam as any).coverageOpacity,
        coverageShape: (cam as any).coverageShape,
        customRadiusMeters: (cam as any).customRadiusMeters,
        distanceToObject: (cam as any).distanceToObject,
      }

      ctx.save()
      ctx.translate(cx, cy)
      // Render 4 DRI concentric coverage zones with exact camera palette & shape (fan/semicircle/circle)
      drawCameraCoverage({
        ctx,
        camera: fullCam,
        scaleMetersPerPixel: effectiveMetersPerPixel / s,
        isSelected: false,
        viewportScale: 1 / Math.max(0.1, s),
        animationTime: 0,
        hideFovLines: data.hideFovLines ?? false
      })
      ctx.restore()

      // Render camera hardware icon with its unique assigned type color & geometry
      const dirAngle = (cam.rotation * Math.PI) / 180
      const iconColor = typeColors.icon

      ctx.save()
      ctx.translate(cx, cy)
      ctx.fillStyle = iconColor

      if (cameraType === 'bullet') {
        ctx.rotate(dirAngle)
        ctx.fillRect(-10 * iconScale * s, -6 * iconScale * s, 20 * iconScale * s, 12 * iconScale * s)
      } else if (cameraType === 'ptz') {
        ctx.rotate(dirAngle - Math.PI / 2)
        ctx.beginPath()
        ctx.moveTo(0, -14 * iconScale * s)
        ctx.lineTo(12 * iconScale * s, 7 * iconScale * s)
        ctx.lineTo(-12 * iconScale * s, 7 * iconScale * s)
        ctx.closePath()
        ctx.fill()
      } else if (cameraType === 'fisheye') {
        ctx.beginPath()
        ctx.arc(0, 0, 14 * iconScale * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, 6 * iconScale * s, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // dome / panoramic / default
        ctx.beginPath()
        ctx.arc(0, 0, 12 * iconScale * s, 0, Math.PI * 2)
        ctx.fill()
      }

      // Direction line stroke
      ctx.strokeStyle = typeColors.stroke
      ctx.lineWidth = Math.max(1.5, 2 * s)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(16 * iconScale * s * Math.cos(dirAngle), 16 * iconScale * s * Math.sin(dirAngle))
      ctx.stroke()

      ctx.restore()

      // Camera label with white rounded badge for high legibility
      const lx = cx + ((cam.labelOffsetX ?? 0) * s)
      const ly = cy + ((cam.labelOffsetY ?? -20) * s)
      const labelVisible = (cam as any).labelVisible ?? cam.name.trim().length > 0
      if (labelVisible && cam.name.trim().length > 0) {
        const fontSize = Math.max(8 * s, ((cam as any).labelFontSize ?? 11) * s)
        const fontFamily = (cam as any).labelFontFamily || 'sans-serif'
        const fontWeight = (cam as any).labelFontWeight || 'normal'
        const fontStyle = (cam as any).labelFontStyle || 'normal'
        ctx.save()
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const textMetrics = ctx.measureText(cam.name)
        const paddingX = 4 * s
        const paddingY = 2 * s
        const bgWidth = textMetrics.width + paddingX * 2
        const bgHeight = fontSize + paddingY * 2
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)'
        ctx.lineWidth = Math.max(0.8, 1 * s)
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(lx - bgWidth / 2, ly - bgHeight / 2, bgWidth, bgHeight, 3 * s)
        } else {
          ctx.rect(lx - bgWidth / 2, ly - bgHeight / 2, bgWidth, bgHeight)
        }
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = (cam as any).labelFontColor || '#0f172a'
        ctx.fillText(cam.name, lx, ly)
        ctx.restore()
      }
    })
  }
    const drawAccess = (mode === 'all' || mode === 'devices' || mode === 'access')
    if (drawAccess && data.accessDevices && data.accessDevices.length) {
      data.accessDevices.forEach(dev => {
        const dx = offsetX + dev.x * s
        const dy = offsetY + dev.y * s
        const iconScale = data.iconScales?.[dev.id] ?? 0.8
        const size = 16 * iconScale * s
        const baseColor =
          dev.type === 'terminal' ? '#9333ea' :
          dev.type === 'lock' ? '#0ea5e9' :
          dev.type === 'exit_button' ? '#22c55e' :
          '#f43f5e'
        ctx.save()
        ctx.translate(dx, dy)
        ctx.fillStyle = baseColor
        if (dev.type === 'terminal') {
          ctx.fillRect(-size / 2, -size / 2, size, size)
        } else if (dev.type === 'lock') {
          ctx.beginPath()
          ctx.roundRect(-size / 2, -size / 4, size, size / 2, 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, size / 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = baseColor
        ctx.lineWidth = Math.max(1, size / 12)
        ctx.beginPath()
        const dir = dev.rotation * (Math.PI / 180)
        ctx.moveTo(0, 0)
        ctx.lineTo((size / 2) * Math.cos(dir), (size / 2) * Math.sin(dir))
        ctx.stroke()
        ctx.restore()
        const lx = dx + ((dev.labelOffsetX ?? 0) * s)
        const labelVisible = dev.labelVisible ?? dev.name.trim().length > 0
        if (labelVisible && dev.name.trim().length > 0) {
          const labelFontSize = computeAccessExportLabelFontSize(s, (dev as any).labelFontSize ?? dev.fontSize)
          const labelFontFamily = resolveAccessLabelFontFamily(
            (typeof (dev as any).labelFontFamily === 'string' && (dev as any).labelFontFamily.trim().length > 0)
              ? (dev as any).labelFontFamily
              : (typeof dev.fontFamily === 'string' && dev.fontFamily.trim().length > 0)
                ? dev.fontFamily
                : undefined
          )
          const effectiveLabelOffsetY = computeAccessExportLabelOffsetY(
            typeof dev.labelOffsetY === 'number' ? dev.labelOffsetY * s : undefined,
            size,
            labelFontSize
          )
          const ly = dy + effectiveLabelOffsetY
          const textWidth = ctx.measureText(dev.name).width
          const paddingX = Math.max(4, labelFontSize * 0.32)
          const paddingY = Math.max(2, labelFontSize * 0.2)
          const bgWidth = Math.max(labelFontSize * 1.9, textWidth + paddingX * 2)
          const bgHeight = Math.max(labelFontSize * 1.15, labelFontSize + paddingY * 2)
          ctx.fillStyle = DEFAULT_ACCESS_LABEL_BG_COLOR
          ctx.strokeStyle = DEFAULT_ACCESS_LABEL_BORDER_COLOR
          ctx.lineWidth = Math.max(0.9, labelFontSize * 0.08)
          ctx.beginPath()
          ctx.roundRect(lx - bgWidth / 2, ly - bgHeight / 2, bgWidth, bgHeight, Math.max(3, labelFontSize * 0.18))
          ctx.fill()
          ctx.stroke()
          ctx.strokeStyle = DEFAULT_ACCESS_LABEL_OUTLINE_COLOR
          ctx.lineWidth = Math.max(1.15, labelFontSize * 0.15)
          ctx.lineJoin = 'round'
          ctx.fillStyle = resolveAccessLabelFontColor((dev as any).labelFontColor)
          ctx.font = `${labelFontSize}px ${labelFontFamily}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.strokeText(dev.name, lx, ly)
          ctx.fillText(dev.name, lx, ly)
        }
      })
    }
    const drawVoceo = (mode === 'all' || mode === 'voceo')
    if (drawVoceo && data.voceoDevices && data.voceoDevices.length) {
      data.voceoDevices.forEach(dev => {
        const dx = offsetX + dev.x * s
        const dy = offsetY + dev.y * s
        const iconScale = data.iconScales?.[dev.id] ?? 0.9
        ctx.save()
        ctx.translate(dx, dy)
        drawVoceoIcon(ctx, {
          type: dev.type,
          state: 'normal',
          iconScale: iconScale * s,
          viewportScale: 1,
          rotationDeg: dev.rotation,
          drawDirection: true
        })
        ctx.restore()
        const lx = dx + ((dev.labelOffsetX ?? 0) * s)
        const ly = dy + ((dev.labelOffsetY ?? -18) * s)
        ctx.fillStyle = '#0f172a'
        ctx.font = `${11 * s}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(dev.name, lx, ly)
      })
    }
    const drawFire = (mode === 'all' || mode === 'fire')
    if (drawFire && data.fireDevices && data.fireDevices.length) {
      data.fireDevices.forEach(dev => {
        const dx = offsetX + dev.x * s
        const dy = offsetY + dev.y * s
        const iconScale = data.iconScales?.[dev.id] ?? 0.9
        ctx.save()
        ctx.translate(dx, dy)
        drawFireIcon(ctx, {
          type: dev.type,
          state: 'normal',
          iconScale: iconScale * s,
          viewportScale: 1,
          rotationDeg: dev.rotation,
          drawDirection: true
        })
        ctx.restore()
        const lx = dx + ((dev.labelOffsetX ?? 0) * s)
        const ly = dy + ((dev.labelOffsetY ?? -18) * s)
        ctx.fillStyle = '#0f172a'
        ctx.font = `${11 * s}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(dev.name, lx, ly)
      })
    }
    const drawParking = (mode === 'all' || mode === 'parking')
    if (drawParking && data.parkingDevices && data.parkingDevices.length) {
      // Prioritize rendering devices over auxiliary texts by drawing texts FIRST (Z-index depth)
      data.parkingDevices.forEach(dev => {
        const dx = offsetX + dev.x * s
        const dy = offsetY + dev.y * s
        const lx = dx + ((dev.labelOffsetX ?? 0) * s)
        const ly = dy + ((dev.labelOffsetY ?? -18) * s)
        
        let fontSize = (dev.labelFontSize || 10) * s
        let fontWeight = 'normal'
        let opacity = 1
        
        if (zoomLevel >= 1.5) {
          // Dynamic font scale when zoom > 150%, keeping it proportional around 8-10px visual at 200% zoom
          fontSize = fontSize * 0.65 // Reduces the relative text size when zoomed
          fontWeight = '500'
          opacity = 0.9
        }
        
        ctx.save()
        ctx.globalAlpha = opacity
        ctx.fillStyle = '#0f172a'
        ctx.font = `${fontWeight} ${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        // text-shadow: none is implicit in canvas unless set
        
        // Add a subtle white outline to improve contrast and readability when overlaying lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = fontSize * 0.15
        ctx.strokeText(dev.name, lx, ly)
        
        ctx.fillText(dev.name, lx, ly)
        ctx.restore()
      })

      // Draw device shapes ON TOP of texts
      data.parkingDevices.forEach(dev => {
        const dx = offsetX + dev.x * s
        const dy = offsetY + dev.y * s
        const iconScale = data.iconScales?.[dev.id] ?? 1
        const size = 20 * iconScale * s

        ctx.save()
        ctx.translate(dx, dy)
        ctx.rotate((dev.rotation * Math.PI) / 180)

        if (dev.type === 'barrier_left') {
          ctx.fillStyle = '#f87171'
          ctx.fillRect(size * 0.1, -size * 0.3, size * 0.3, size * 0.6)
          ctx.fillStyle = '#facc15'
          ctx.fillRect(-size * 0.9, -size * 0.1, size * 1.1, size * 0.2)
          ctx.fillStyle = '#000'
          ctx.fillRect(-size * 0.8, -size * 0.1, size * 0.15, size * 0.2)
          ctx.fillRect(-size * 0.5, -size * 0.1, size * 0.15, size * 0.2)
        } else if (dev.type === 'barrier_right') {
          ctx.fillStyle = '#f87171'
          ctx.fillRect(-size * 0.4, -size * 0.3, size * 0.3, size * 0.6)
          ctx.fillStyle = '#facc15'
          ctx.fillRect(-size * 0.2, -size * 0.1, size * 1.1, size * 0.2)
          ctx.fillStyle = '#000'
          ctx.fillRect(size * 0.3, -size * 0.1, size * 0.15, size * 0.2)
          ctx.fillRect(size * 0.6, -size * 0.1, size * 0.15, size * 0.2)
        } else if (dev.type === 'barrier') {
          ctx.fillStyle = '#f87171'
          ctx.fillRect(-size * 0.15, -size * 0.3, size * 0.3, size * 0.6)
          ctx.fillStyle = '#facc15'
          ctx.fillRect(-size * 0.9, -size * 0.1, size * 1.8, size * 0.2)
        } else if (dev.type === 'uhf_reader') {
          ctx.fillStyle = '#60a5fa'
          ctx.fillRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8)
          ctx.beginPath()
          ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(-size * 0.6, 0)
          ctx.lineTo(-size * 0.8, -size * 0.2)
          ctx.lineTo(-size * 0.8, size * 0.2)
          ctx.closePath()
          ctx.fillStyle = '#3b82f6'
          ctx.fill()
        } else if (dev.type === 'tag') {
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(-size * 0.1, -size * 0.1, size * 0.2, size * 0.2)
        } else if (dev.type === 'magnetic_loop') {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
          ctx.fillRect(-size * 0.4, -size * 0.8, size * 0.8, size * 1.6)
          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = Math.max(1, 1.5 * s)
          ctx.setLineDash([4 * s, 4 * s])
          ctx.strokeRect(-size * 0.4, -size * 0.8, size * 0.8, size * 1.6)
          ctx.setLineDash([])
        } else if (dev.type === 'parking_meter') {
          ctx.fillStyle = '#94a3b8'
          ctx.fillRect(-size * 0.3, -size * 0.5, size * 0.6, size)
          ctx.fillStyle = '#334155'
          ctx.fillRect(-size * 0.2, -size * 0.4, size * 0.4, size * 0.3)
          ctx.fillStyle = '#10b981'
          ctx.beginPath()
          ctx.arc(0, size * 0.2, size * 0.1, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = '#cbd5e1'
          ctx.beginPath()
          ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })
    }

  drawEmptyStateOverlay(ctx, data, getFloorPlanForMode(data, mode), mode, s, offsetX, offsetY, targetW, targetH, baseW, baseH)
  applySharpen(c, 0.4)
  ;(c as any)._transform = transform
  ;(c as any)._deviceMap = collectDeviceMap(data, mode, transform)
  ;(c as any)._layout = layout
  return c
}

/**
 * Construye un mapa de dispositivos con sus coordenadas reales en el
 * canvas del PDF (post-transformación uniforme). Lo usa la UI para
 * mostrar la previsualización y los tests para validar la fidelidad
 * espacial dentro del margen del 1%.
 */
function collectDeviceMap(
  data: ExportProjectData,
  mode: string,
  t: { scale: number; offsetX: number; offsetY: number; baseW: number; baseH: number; targetW?: number; targetH?: number }
) {
  const out: Array<{
    id: string
    kind: 'camera' | 'access' | 'voceo' | 'fire' | 'parking'
    type: string
    origX: number
    origY: number
    canvasX: number
    canvasY: number
    visible: boolean
  }> = []
  const project = (x: number, y: number) => {
    const point = applySpatialTransform(
      {
        baseW: t.baseW,
        baseH: t.baseH,
        scale: t.scale,
        offsetX: t.offsetX,
        offsetY: t.offsetY,
        targetW: t.targetW ?? Math.round(t.baseW * t.scale),
        targetH: t.targetH ?? Math.round(t.baseH * t.scale),
      },
      x,
      y
    )
    return {
      canvasX: point.x,
      canvasY: point.y,
      visible:
        point.x >= 0 &&
        point.x <= (t.targetW ?? (t.offsetX + t.baseW * t.scale)) &&
        point.y >= 0 &&
        point.y <= (t.targetH ?? (t.offsetY + t.baseH * t.scale)),
    }
  }
  if (mode === 'all' || mode === 'cams') {
    for (const c of data.cameras) {
      const p = project(c.x, c.y)
      out.push({ id: c.id, kind: 'camera', type: c.type, origX: c.x, origY: c.y, ...p })
    }
  }
  if (mode === 'all' || mode === 'devices' || mode === 'access') {
    for (const d of data.accessDevices ?? []) {
      const p = project(d.x, d.y)
      out.push({ id: d.id, kind: 'access', type: d.type ?? '', origX: d.x, origY: d.y, ...p })
    }
  }
  if (mode === 'all' || mode === 'voceo') {
    for (const d of data.voceoDevices ?? []) {
      const p = project(d.x, d.y)
      out.push({ id: d.id, kind: 'voceo', type: d.type ?? '', origX: d.x, origY: d.y, ...p })
    }
  }
  if (mode === 'all' || mode === 'fire') {
    for (const d of data.fireDevices ?? []) {
      const p = project(d.x, d.y)
      out.push({ id: d.id, kind: 'fire', type: d.type ?? '', origX: d.x, origY: d.y, ...p })
    }
  }
  if (mode === 'all' || mode === 'parking') {
    for (const d of data.parkingDevices ?? []) {
      const p = project(d.x, d.y)
      out.push({ id: d.id, kind: 'parking', type: d.type ?? '', origX: d.x, origY: d.y, ...p })
    }
  }
  return out
}

function cropAround(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const sx = Math.max(0, Math.min(canvas.width - w, x - w / 2))
  const sy = Math.max(0, Math.min(canvas.height - h, y - h / 2))
  ctx.drawImage(canvas, sx, sy, w, h, 0, 0, w, h)
  return c
}

export async function exportProfessionalPdf(project: ExportProjectData, options: PdfOptions, filename: string) {
  const doc = new jsPDF({
    orientation: options.orientation,
    format: options.format,
    unit: 'pt',
    hotfixes: ['px_scaling'],
  })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = {
    top: mmToPt(options.marginTop),
    right: mmToPt(options.marginRight),
    bottom: mmToPt(options.marginBottom),
    left: mmToPt(options.marginLeft),
  }
  const today = new Date()
  const dateStr = formatDate(today)
  const dateTimeStr = formatDateTime(today)
  doc.setProperties({
    title: options.title || project.projectTitle || 'Proyecto CCTV',
    subject: options.subject || '',
    author: options.author || project.author || '',
    creator: project.companyName || 'CCTV Planner Pro',
  })
  doc.setFont('helvetica', 'normal')

  await addCoverPageToDoc(doc, project, options, filename)

  const headerHeightPt = mmToPt(22)
  async function drawHeader() {
    const logoW = mmToPt(30)
    const logoH = mmToPt(12)
    if (project.logoDataUrl) {
      // preserve aspect ratio of original image within max box
      const nat = await (async () => {
        return new Promise<{ w: number; h: number }>((res) => {
          const im = new Image()
          im.onload = () => res({ w: im.naturalWidth || im.width, h: im.naturalHeight || im.height })
          im.onerror = () => res({ w: 1, h: 1 })
          im.src = project.logoDataUrl!
        })
      })()
      const aspect = nat.w / Math.max(1, nat.h)
      let drawW = logoW
      let drawH = drawW / aspect
      if (drawH > logoH) {
        drawH = logoH
        drawW = drawH * aspect
      }
      doc.addImage(project.logoDataUrl, 'PNG', margin.left, margin.top, drawW, drawH)
    }
    const company = project.companyName || options.companyName || ''
    const titleText = project.projectTitle || options.projectTitle || options.title || 'Proyecto CCTV'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const companyWidth = doc.getTextWidth(company)
    doc.text(company, (pageW - companyWidth) / 2, margin.top + mmToPt(6))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const projWidth = doc.getTextWidth(titleText)
    doc.text(titleText, (pageW - projWidth) / 2, margin.top + mmToPt(12))
    doc.setLineWidth(0.5)
    doc.line(margin.left, margin.top + headerHeightPt, pageW - margin.right, margin.top + headerHeightPt)
  }

  function drawFooter(pageNum: number) {
    const leftY = pageH - margin.bottom - mmToPt(8)
    const author = project.author || options.author || ''
    const docTitle = options.title || project.projectTitle || 'Documento'
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(author, margin.left, leftY)
    doc.text(docTitle, margin.left, leftY + mmToPt(5))
    const rightText = `${dateTimeStr} • Página ${pageNum}`
    const tw = doc.getTextWidth(rightText)
    doc.text(rightText, pageW - margin.right - tw, pageH - margin.bottom)
  }

  await drawHeader()
  const availW = pageW - margin.left - margin.right
  const availH = pageH - margin.top - headerHeightPt - margin.bottom
  const targetPxW = Math.round((availW / 72) * 400)
  const targetPxH = Math.round((availH / 72) * 400)
  const camsCanvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'cams')
  const camsImg = camsCanvas.toDataURL('image/jpeg', options.imageQuality)
  doc.addImage(camsImg, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
  drawFooter(1)
  doc.addPage()
  await drawHeader()
  const devCanvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'devices')
  const devImg = devCanvas.toDataURL('image/jpeg', options.imageQuality)
  doc.addImage(devImg, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
  drawFooter(2)
  const designCanvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'all')
  const cams = project.cameras
  let pageNum = 3
  for (let i = 0; i < cams.length; i += 2) {
    doc.addPage()
    await drawHeader()
    const c1 = cams[i]
    const c2 = cams[i + 1]
    doc.setFontSize(14)
    const gutterPt = mmToPt(12)
    const blockWpt = (availW - gutterPt) / 2
    const blockHpt = availH - mmToPt(12)
    const blockY = margin.top + headerHeightPt + mmToPt(8)
    const leftX = margin.left
    const rightX = margin.left + blockWpt + gutterPt
    const paddingPt = mmToPt(4)
    const titleHpt = mmToPt(10)
    const cropHpt = blockHpt - titleHpt - mmToPt(26)
    const innerWpt = blockWpt - paddingPt * 2
    const cropPxW = Math.round((innerWpt / 72) * 400)
    const cropPxH = Math.round((cropHpt / 72) * 400)
    const t = (designCanvas as any)._transform
    const mapX = t ? (x: number) => Math.round(t.offsetX + x * t.scale) : (x: number) => Math.round(x * (designCanvas.width / EXPORT_BASE_W))
    const mapY = t ? (y: number) => Math.round(t.offsetY + y * t.scale) : (y: number) => Math.round(y * (designCanvas.height / EXPORT_BASE_H))
    const leftFill = '#f6f8fb'
    const rightFill = '#f8f6fb'
    const border = '#d9dee8'
    const headerLeft = '#eaf0ff'
    const headerRight = '#f0eaff'
    if (c1) {
      doc.setDrawColor(border)
      doc.setFillColor(leftFill)
      doc.roundedRect(leftX, blockY, blockWpt, blockHpt, 4, 4, 'F')
      doc.setFillColor(headerLeft)
      doc.rect(leftX, blockY, blockWpt, titleHpt, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(`Cámara ${i + 1}: ${c1.name}`, leftX + paddingPt, blockY + titleHpt - mmToPt(3))
      const cx = mapX(c1.x)
      const cy = mapY(c1.y)
      const crop1 = cropAround(designCanvas, cx, cy, cropPxW, cropPxH)
      const img1 = crop1.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img1, 'JPEG', leftX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const desc1 = project.cameraDescriptions?.[c1.id] || `Cobertura aproximada en entorno (${c1.x}, ${c1.y}) px, orientación ${Math.round(c1.rotation)}°, FOV ${Math.round(c1.fov)}°.`
      doc.text(desc1, leftX + paddingPt, blockY + titleHpt + paddingPt + cropHpt + mmToPt(4), { maxWidth: innerWpt })
    }
    if (c2) {
      doc.setDrawColor(border)
      doc.setFillColor(rightFill)
      doc.roundedRect(rightX, blockY, blockWpt, blockHpt, 4, 4, 'F')
      doc.setFillColor(headerRight)
      doc.rect(rightX, blockY, blockWpt, titleHpt, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(`Cámara ${i + 2}: ${c2.name}`, rightX + paddingPt, blockY + titleHpt - mmToPt(3))
      const cx2 = mapX(c2.x)
      const cy2 = mapY(c2.y)
      const crop2 = cropAround(designCanvas, cx2, cy2, cropPxW, cropPxH)
      const img2 = crop2.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img2, 'JPEG', rightX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const desc2 = project.cameraDescriptions?.[c2.id] || `Cobertura aproximada en entorno (${c2.x}, ${c2.y}) px, orientación ${Math.round(c2.rotation)}°, FOV ${Math.round(c2.fov)}°.`
      doc.text(desc2, rightX + paddingPt, blockY + titleHpt + paddingPt + cropHpt + mmToPt(4), { maxWidth: innerWpt })
    }
    if (c1 && c2) {
      const dx = mapX(c2.x) - mapX(c1.x)
      const dy = mapY(c2.y) - mapY(c1.y)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 400) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        const note = 'Nota: Ambas cámaras cubren áreas relacionadas o contiguas; verifique solapamiento y complementariedad de ángulos.'
        const twNote = doc.getTextWidth(note)
        doc.text(note, margin.left + (availW - twNote) / 2, blockY + blockHpt + mmToPt(6))
      }
    }
    drawFooter(pageNum)
    pageNum++
  }
  doc.addPage()
  await drawHeader()
  doc.setFontSize(16)
  doc.text('Lista de Cámaras e Información Técnica', margin.left, margin.top + headerHeightPt)
  const startY = margin.top + mmToPt(10)
  doc.setFontSize(11)
  const cols = ['ID', 'Ubicación', 'Tipo/Modelo', 'Resolución', 'Características', 'Notas']
  const colW = (pageW - margin.left - margin.right) / cols.length
  for (let ci = 0; ci < cols.length; ci++) {
    doc.text(cols[ci], margin.left + colW * ci + mmToPt(2), startY + headerHeightPt)
  }
  let rowY = startY + headerHeightPt + mmToPt(6)
  doc.setFontSize(10)
  project.cameras.forEach(cam => {
    const feats = cam.type === 'ptz' ? 'PTZ' : cam.type === 'bullet' ? 'IR' : cam.type === 'dome' ? 'Audio' : ''
    const cells = [cam.id, cam.name, cam.type, cam.resolution, feats, '']
    for (let ci = 0; ci < cells.length; ci++) {
      const x = margin.left + colW * ci + mmToPt(2)
      doc.text(String(cells[ci] || ''), x, rowY)
    }
    rowY += mmToPt(6)
    if (rowY > pageH - margin.bottom - mmToPt(20)) {
      doc.addPage()
      drawHeader()
      rowY = margin.top + headerHeightPt
    }
  })
  doc.setFontSize(11)
  const extraY = Math.min(pageH - margin.bottom - mmToPt(40), rowY + mmToPt(10))
  doc.text('Información técnica adicional', margin.left, extraY)
  doc.setFontSize(9)
  doc.text('Escala del plano: ' + (project.floorPlan?.scaleMetersPerPixel ? `${project.floorPlan.scaleMetersPerPixel.toFixed(4)} m/px` : 'No definida'), margin.left, extraY + mmToPt(6))
  drawFooter(pageNum)
  doc.save(filename)
}

export type ExportSubsystem = 'cctv' | 'access' | 'voceo' | 'fire' | 'cam_individual' | 'parking'

function drawSubsystemLegend(doc: jsPDF, subsystem: ExportSubsystem, x: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Leyenda', x, y)
  doc.setFont('helvetica', 'normal')
  const line = (label: string, dy: number, draw: (ox: number, oy: number) => void) => {
    const ox = x
    const oy = y + dy
    // draw symbol at (ox, oy-3)
    draw(ox, oy - 3)
    doc.text(label, ox + 14, oy)
  }
  const drawCircle = (ox: number, oy: number) => {
    doc.setDrawColor('#64748b')
    doc.circle(ox + 6, oy - 3, 3)
  }
  const drawRect = (ox: number, oy: number) => {
    doc.setFillColor('#7c3aed')
    doc.rect(ox + 3, oy - 6, 8, 6, 'F')
  }
  const drawRoundRect = (ox: number, oy: number) => {
    doc.setFillColor('#60a5fa')
    doc.roundedRect(ox + 3, oy - 6, 8, 6, 2, 2, 'F')
  }
  const drawCircleSmall = (ox: number, oy: number) => {
    doc.setFillColor('#ef4444')
    doc.circle(ox + 6, oy - 3, 3, 'F')
  }
  const drawParkingMeter = (ox: number, oy: number) => {
    doc.setFillColor('#94a3b8')
    doc.rect(ox + 4, oy - 6, 4, 6, 'F')
    doc.setFillColor('#334155')
    doc.rect(ox + 4.5, oy - 5.5, 3, 2, 'F')
    doc.setFillColor('#10b981')
    doc.circle(ox + 6, oy - 1, 1.5, 'F')
  }
  const drawBarrier = (ox: number, oy: number) => {
    doc.setFillColor('#f87171')
    doc.rect(ox + 3, oy - 4, 2, 4, 'F')
    doc.setFillColor('#facc15')
    doc.rect(ox + 5, oy - 3, 6, 2, 'F')
  }
  const drawUHF = (ox: number, oy: number) => {
    doc.setFillColor('#60a5fa')
    doc.rect(ox + 3, oy - 6, 6, 6, 'F')
    doc.setFillColor('#ffffff')
    doc.circle(ox + 6, oy - 3, 1.5, 'F')
  }
  const drawLoop = (ox: number, oy: number) => {
    doc.setDrawColor('#10b981')
    doc.setFillColor('#a7f3d0')
    doc.setLineWidth(0.5)
    doc.setLineDashPattern([2, 1], 0)
    doc.rect(ox + 2, oy - 5, 8, 5, 'FD')
    doc.setLineDashPattern([], 0)
  }
  if (subsystem === 'cctv') {
    line('Cámara (cuerpo)', 12, drawCircle)
    line('Dirección y FOV', 24, (ox, oy) => { doc.setDrawColor('#64748b'); doc.line(ox + 2, oy - 3, ox + 12, oy - 3) })
  } else if (subsystem === 'access') {
    line('Terminal', 12, drawRect)
    line('Chapa magnética', 24, drawRoundRect)
    line('Botones/Señalización', 36, drawCircleSmall)
  } else if (subsystem === 'voceo') {
    line('Bocina', 12, (ox, oy) => { doc.setFillColor('#f59e0b'); doc.triangle(ox + 3, oy - 6, ox + 11, oy - 3, ox + 3, oy, 'F') })
    line('Corneta', 24, (ox, oy) => { doc.setFillColor('#fb7185'); doc.triangle(ox + 3, oy - 6, ox + 11, oy - 3, ox + 3, oy, 'F') })
    line('Panel', 36, (ox, oy) => { doc.setFillColor('#22c55e'); doc.roundedRect(ox + 3, oy - 6, 8, 6, 2, 2, 'F') })
  } else if (subsystem === 'fire') {
    line('Panel / Central', 12, (ox, oy) => { doc.setFillColor('#dc2626'); doc.roundedRect(ox + 3, oy - 6, 8, 6, 2, 2, 'F') })
    line('Detector de Humo', 24, (ox, oy) => { doc.setFillColor('#f8fafc'); doc.setDrawColor('#334155'); doc.circle(ox + 6, oy - 3, 3, 'FD'); doc.setFillColor('#ef4444'); doc.circle(ox + 6, oy - 3, 1, 'F') })
    line('Detector Térmico', 36, (ox, oy) => { doc.setFillColor('#f97316'); doc.circle(ox + 6, oy - 3, 3, 'F') })
    line('Estación Manual', 48, (ox, oy) => { doc.setFillColor('#b91c1c'); doc.rect(ox + 3, oy - 6, 8, 6, 'F') })
    line('Corneta / Estrobo A/V', 60, (ox, oy) => { doc.setFillColor('#dc2626'); doc.rect(ox + 3, oy - 6, 7, 6, 'F'); doc.setFillColor('#facc15'); doc.circle(ox + 6.5, oy - 1.5, 1.5, 'F') })
    line('Módulo / Fuente', 72, (ox, oy) => { doc.setFillColor('#0284c7'); doc.roundedRect(ox + 3, oy - 6, 8, 6, 2, 2, 'F') })
  } else if (subsystem === 'parking') {
    line('Parquímetro', 12, drawParkingMeter)
    line('Barrera', 24, drawBarrier)
    line('Lector UHF', 36, drawUHF)
    line('Lazo Magnético', 48, drawLoop)
  }
}

async function renderSingleCameraCanvas(
  project: ExportProjectData,
  targetW: number,
  targetH: number,
  camId: string
) {
  const minimal: ExportProjectData = {
    ...project,
    cameras: project.cameras.filter(c => c.id === camId),
    accessDevices: [],
    voceoDevices: [],
    fireDevices: [],
  }
  return renderDesignCanvas(minimal, targetW, targetH, 'cams')
}

type AccessExportDevice = NonNullable<ExportProjectData['accessDevices']>[number]
type AccessExportGroup = ReturnType<typeof buildAccessExportGroups<AccessExportDevice>>[number]
const ACCESS_GROUP_SUPERSAMPLE_FACTOR = 2

function buildGroupedAccessLabelOffsets(device: AccessExportDevice, orderIndex: number, iconScale: number) {
  const slot = orderIndex % ACCESS_GROUP_SIZE
  const fontSize = computeAccessExportLabelFontSize(1, (device as any).labelFontSize ?? device.fontSize)
  const iconSize = 16 * iconScale
  const labelHalfWidth = estimateAccessLabelWidth(device.name, fontSize) / 2
  const gap = iconSize * 1.2 + fontSize * 0.9

  if (slot === 0) {
    return { labelOffsetX: 0, labelOffsetY: -(gap + fontSize * 0.8) }
  }
  if (slot === 1) {
    return { labelOffsetX: gap + labelHalfWidth * 0.92, labelOffsetY: -(fontSize * 0.65) }
  }
  if (slot === 2) {
    return {
      labelOffsetX: gap * 0.78 + labelHalfWidth * 0.78,
      labelOffsetY: gap + fontSize * 0.9,
    }
  }
  if (slot === 3) {
    return {
      labelOffsetX: -(gap * 0.78 + labelHalfWidth * 0.78),
      labelOffsetY: gap + fontSize * 0.9,
    }
  }
  return { labelOffsetX: -(gap + labelHalfWidth * 0.92), labelOffsetY: -(fontSize * 0.65) }
}

async function renderAccessGroupCanvas(
  project: ExportProjectData,
  targetW: number,
  targetH: number,
  deviceIds: string[]
) {
  const groupIds = new Set(deviceIds)
  const groupOrder = new Map(deviceIds.map((id, index) => [id, index]))
  const minimal: ExportProjectData = {
    ...project,
    floorPlan: project.floorPlanAccess ?? project.floorPlan,
    cameras: [],
    accessDevices: (project.accessDevices ?? [])
      .filter(d => groupIds.has(d.id))
      .map(d => ({
        ...d,
        labelVisible: true,
        ...buildGroupedAccessLabelOffsets(
          d,
          groupOrder.get(d.id) ?? 0,
          project.iconScales?.[d.id] ?? 0.8
        ),
      })),
    voceoDevices: [],
    fireDevices: [],
  }
  return renderDesignCanvas(minimal, targetW, targetH, 'access')
}

export function mapPointToCanvas(canvas: HTMLCanvasElement, x: number, y: number) {
  const t = (canvas as any)._transform
  if (t) {
    return applySpatialTransform(
      {
        baseW: t.baseW,
        baseH: t.baseH,
        scale: t.scale,
        offsetX: t.offsetX,
        offsetY: t.offsetY,
        targetW: t.targetW ?? canvas.width,
        targetH: t.targetH ?? canvas.height,
      },
      x,
      y
    )
  }
  return {
    x: Math.round(x * (canvas.width / EXPORT_BASE_W)),
    y: Math.round(y * (canvas.height / EXPORT_BASE_H)),
  }
}

function cropAroundPoints(
  canvas: HTMLCanvasElement,
  points: Array<{ x: number; y: number }>,
  targetW: number,
  targetH: number
) {
  if (points.length === 0) return createCanvas(targetW, targetH)

  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(48, maxX - minX)
  const spanY = Math.max(48, maxY - minY)
  const padding = Math.max(56, Math.round(Math.max(spanX, spanY) * 0.65))
  const aspect = targetW / Math.max(1, targetH)

  let sourceW = Math.min(canvas.width, spanX + padding * 2)
  let sourceH = Math.min(canvas.height, spanY + padding * 2)

  if (sourceW / sourceH > aspect) {
    sourceH = Math.min(canvas.height, sourceW / aspect)
  } else {
    sourceW = Math.min(canvas.width, sourceH * aspect)
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const sourceX = Math.max(0, Math.min(canvas.width - sourceW, centerX - sourceW / 2))
  const sourceY = Math.max(0, Math.min(canvas.height - sourceH, centerY - sourceH / 2))

  const cropped = createCanvas(targetW, targetH)
  const ctx = cropped.getContext('2d')
  if (!ctx) return cropped

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetW, targetH)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, targetW, targetH)
  return cropped
}

function getAccessGroupFocusPoints(
  canvas: HTMLCanvasElement,
  project: ExportProjectData,
  devices: AccessExportDevice[]
) {
  const t = (canvas as any)._transform
  const scale = typeof t?.scale === 'number' ? t.scale : canvas.width / EXPORT_BASE_W

  return devices.flatMap(device => {
    const iconPoint = mapPointToCanvas(canvas, device.x, device.y)
    const labelX = iconPoint.x + ((device.labelOffsetX ?? 0) * scale)
    const iconScale = project.iconScales?.[device.id] ?? 0.8
    const iconSize = 16 * iconScale * scale
    const labelFontSize = computeAccessExportLabelFontSize(scale, (device as any).labelFontSize ?? device.fontSize)
    const effectiveLabelOffsetY = computeAccessExportLabelOffsetY(
      typeof device.labelOffsetY === 'number' ? device.labelOffsetY * scale : undefined,
      iconSize,
      labelFontSize
    )
    const labelY = iconPoint.y + effectiveLabelOffsetY
    const labelHalfWidth = estimateAccessLabelWidth(device.name, labelFontSize) / 2
    const labelHalfHeight = Math.max(10, labelFontSize * 0.62)

    return [
      iconPoint,
      { x: labelX - labelHalfWidth, y: labelY - labelHalfHeight },
      { x: labelX + labelHalfWidth, y: labelY - labelHalfHeight },
      { x: labelX - labelHalfWidth, y: labelY + labelHalfHeight },
      { x: labelX + labelHalfWidth, y: labelY + labelHalfHeight },
    ]
  })
}

async function drawAccessGroupBlock(args: {
  doc: jsPDF
  group: AccessExportGroup
  project: ExportProjectData
  options: PdfOptions
  x: number
  y: number
  width: number
  height: number
  cropPxW: number
  cropPxH: number
  fillColor: string
  headerFillColor: string
}) {
  const { doc, group, project, options, x, y, width, height, cropPxW, cropPxH, fillColor, headerFillColor } = args
  const border = '#d9dee8'
  const paddingPt = mmToPt(4)
  const titleHpt = mmToPt(12)
  const detailsHpt = mmToPt(34)
  const innerWpt = width - paddingPt * 2
  const cropHpt = height - titleHpt - detailsHpt - paddingPt * 3
  const cropY = y + titleHpt + paddingPt
  const textY = cropY + cropHpt + mmToPt(5)

  doc.setDrawColor(border)
  doc.setFillColor(fillColor)
  doc.roundedRect(x, y, width, height, 4, 4, 'F')
  doc.setFillColor(headerFillColor)
  doc.rect(x, y, width, titleHpt, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(group.title, x + paddingPt, y + titleHpt - mmToPt(3))

  const renderPxW = cropPxW * ACCESS_GROUP_SUPERSAMPLE_FACTOR
  const renderPxH = cropPxH * ACCESS_GROUP_SUPERSAMPLE_FACTOR
  const groupCanvas = await renderAccessGroupCanvas(project, renderPxW, renderPxH, group.devices.map(device => device.id))
  const focusPoints = getAccessGroupFocusPoints(groupCanvas, project, group.devices)
  const cropCanvas = cropAroundPoints(groupCanvas, focusPoints, renderPxW, renderPxH)
  const cropImg = cropCanvas.toDataURL('image/png')
  doc.addImage(cropImg, 'PNG', x + paddingPt, cropY, innerWpt, cropHpt)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor('#334155')
  doc.text('Dispositivos asociados', x + paddingPt, textY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#0f172a')
  doc.text(group.devices.map(device => `- ${device.name}`), x + paddingPt, textY + mmToPt(5), {
    maxWidth: innerWpt,
    lineHeightFactor: 1.2,
  })
}

async function appendAccessGroupPages(args: {
  doc: jsPDF
  project: ExportProjectData
  options: PdfOptions
  availW: number
  availH: number
  margin: { top: number; right: number; bottom: number; left: number }
  headerHeightPt: number
  imageDpi: number
  pageNum: number
  drawHeader: (subtitle: string) => Promise<void>
  drawFooter: (pageNum: number) => void
}) {
  const { doc, project, options, availW, availH, margin, headerHeightPt, imageDpi, drawHeader, drawFooter } = args
  const groups = buildAccessExportGroups(project.accessDevices ?? [])
  if (groups.length === 0) return args.pageNum

  const gutterPt = mmToPt(12)
  const blockWpt = (availW - gutterPt) / 2
  const blockHpt = availH - mmToPt(12)
  const blockY = margin.top + headerHeightPt + mmToPt(8)
  const leftX = margin.left
  const rightX = margin.left + blockWpt + gutterPt
  const paddingPt = mmToPt(4)
  const titleHpt = mmToPt(12)
  const detailsHpt = mmToPt(34)
  const innerWpt = blockWpt - paddingPt * 2
  const cropHpt = blockHpt - titleHpt - detailsHpt - paddingPt * 3
  const cropPxW = Math.round((innerWpt / 72) * imageDpi)
  const cropPxH = Math.round((cropHpt / 72) * imageDpi)
  let pageNum = args.pageNum

  for (let i = 0; i < groups.length; i += ACCESS_GROUPS_PER_PAGE) {
    doc.addPage()
    await drawHeader('Kit Control de Acceso (Individuales)')
    const pageGroups = groups.slice(i, i + ACCESS_GROUPS_PER_PAGE)

    if (pageGroups[0]) {
      await drawAccessGroupBlock({
        doc,
        group: pageGroups[0],
        project,
        options,
        x: leftX,
        y: blockY,
        width: blockWpt,
        height: blockHpt,
        cropPxW,
        cropPxH,
        fillColor: '#f6f8fb',
        headerFillColor: '#eaf0ff',
      })
    }

    if (pageGroups[1]) {
      await drawAccessGroupBlock({
        doc,
        group: pageGroups[1],
        project,
        options,
        x: rightX,
        y: blockY,
        width: blockWpt,
        height: blockHpt,
        cropPxW,
        cropPxH,
        fillColor: '#f8f6fb',
        headerFillColor: '#f0eaff',
      })
    }

    drawFooter(pageNum)
    pageNum++
  }

  return pageNum
}

export async function buildSubsystemPdfDocument(
  project: ExportProjectData,
  options: PdfOptions,
  subsystem: ExportSubsystem,
  filename: string
) {
  // Validación previa: no abortamos, pero reportamos issues en consola y en
  // el log de auditoría (visible en CI) para que la UI pueda mostrarlos
  // antes de continuar con la exportación.
  const validation = runExportValidation(project, subsystem)
  if (validation.issues.length > 0) {
    logValidationIssues(validation, `exportSubsystemPdf(${subsystem})`)
  }
  const doc = new jsPDF({
    orientation: options.orientation,
    format: options.format,
    unit: 'pt',
    hotfixes: ['px_scaling'],
  })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = {
    top: mmToPt(options.marginTop),
    right: mmToPt(options.marginRight),
    bottom: mmToPt(options.marginBottom),
    left: mmToPt(options.marginLeft),
  }
  const headerHeightPt = mmToPt(22)
  doc.setProperties({
    title: (options.title || project.projectTitle || 'Documento') + ` - ${subsystem.toUpperCase()}`,
    subject: options.subject || '',
    author: options.author || project.author || '',
    creator: project.companyName || 'CCTV Planner Pro',
  })
  const today = new Date()
  const dateTimeStr = formatDateTime(today)
  function drawFooter(pageNum: number) {
    const leftY = pageH - margin.bottom - mmToPt(8)
    const author = project.author || options.author || ''
    const docTitle = options.title || project.projectTitle || 'Documento'
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(author, margin.left, leftY)
    doc.text(docTitle, margin.left, leftY + mmToPt(5))
    const rightText = `${dateTimeStr} • Página ${pageNum}`
    const tw = doc.getTextWidth(rightText)
    doc.text(rightText, pageW - margin.right - tw, pageH - margin.bottom)
  }
  async function drawHeader(subtitle: string) {
    const logoW = mmToPt(30)
    const logoH = mmToPt(12)
    if (project.logoDataUrl) {
      try {
        const im = new Image()
        await new Promise<void>((res) => { im.onload = () => res(); im.onerror = () => res(); im.src = project.logoDataUrl! })
        const aspect = (im.naturalWidth || im.width || 1) / Math.max(1, (im.naturalHeight || im.height || 1))
        let drawW = logoW
        let drawH = drawW / aspect
        if (drawH > logoH) { drawH = logoH; drawW = drawH * aspect }
        doc.addImage(project.logoDataUrl!, 'PNG', margin.left, margin.top, drawW, drawH)
      } catch {}
    }
    const company = project.companyName || options.companyName || ''
    const titleText = (project.projectTitle || options.projectTitle || options.title || 'Proyecto') + (subtitle ? ` • ${subtitle}` : '')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const companyWidth = doc.getTextWidth(company)
    doc.text(company, (pageW - companyWidth) / 2, margin.top + mmToPt(6))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const projWidth = doc.getTextWidth(titleText)
    doc.text(titleText, (pageW - projWidth) / 2, margin.top + mmToPt(12))
    doc.setLineWidth(0.5)
    doc.line(margin.left, margin.top + headerHeightPt, pageW - margin.right, margin.top + headerHeightPt)
  }
  const toc: Array<{ title: string; page: number | string }> = []
  const label =
    subsystem === 'cctv' ? 'CCTV' :
    subsystem === 'access' ? 'Control de Acceso' :
    subsystem === 'voceo' ? 'Voceo' :
    subsystem === 'fire' ? 'Incendio' : 'Cámaras Individuales'
  toc.push({ title: label, page: 2 })
  if (subsystem === 'access') {
    const detailPages = getAccessDetailPageCount(project.accessDevices?.length ?? 0)
    if (detailPages === 1) toc.push({ title: 'Kit Control de Acceso (Individuales)', page: 3 })
    if (detailPages > 1) toc.push({ title: 'Kit Control de Acceso (Individuales)', page: `3 - ${2 + detailPages}` })
  }
  const ok = await addCoverPageToDoc(doc, project, options, filename, toc)
  if (!ok) throw new Error('No se pudo generar la portada')
  const availW = pageW - margin.left - margin.right
  const availH = pageH - margin.top - headerHeightPt - margin.bottom
  const imageDpi = 400
  const targetPxW = Math.round((availW / 72) * imageDpi)
  const targetPxH = Math.round((availH / 72) * imageDpi)
  let pageNum = 2
  if (subsystem === 'cctv') {
    await drawHeader('CCTV (solo cámaras)')
    const canvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'cams')
    const img = canvas.toDataURL('image/jpeg', options.imageQuality)
    doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
    drawSubsystemLegend(doc, 'cctv', pageW - margin.right - mmToPt(45), pageH - margin.bottom - mmToPt(50))
    drawFooter(pageNum)
  } else if (subsystem === 'access') {
    await drawHeader('Control de Acceso')
    const proj: ExportProjectData = { ...project, floorPlan: project.floorPlanAccess ?? project.floorPlan }
    const canvas = await renderDesignCanvas(proj, targetPxW, targetPxH, 'access')
    const img = canvas.toDataURL('image/jpeg', options.imageQuality)
    doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
    drawSubsystemLegend(doc, 'access', pageW - margin.right - mmToPt(55), pageH - margin.bottom - mmToPt(60))
    drawFooter(pageNum)
    pageNum++
    pageNum = await appendAccessGroupPages({
      doc,
      project: proj,
      options,
      availW,
      availH,
      margin,
      headerHeightPt,
      imageDpi,
      pageNum,
      drawHeader,
      drawFooter,
    })
  } else if (subsystem === 'voceo') {
    await drawHeader('Voceo / Llamado de Enfermeras')
    const proj: ExportProjectData = { ...project, floorPlan: project.floorPlanVoceo ?? project.floorPlan }
    const canvas = await renderDesignCanvas(proj, targetPxW, targetPxH, 'voceo')
    const img = canvas.toDataURL('image/jpeg', options.imageQuality)
    doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
    drawSubsystemLegend(doc, 'voceo', pageW - margin.right - mmToPt(55), pageH - margin.bottom - mmToPt(60))
    drawFooter(pageNum)
  } else if (subsystem === 'fire') {
    await drawHeader('Sistema Contra Incendios')
    const proj: ExportProjectData = { ...project, floorPlan: project.floorPlanFire ?? project.floorPlan }
    const canvas = await renderDesignCanvas(proj, targetPxW, targetPxH, 'fire')
    const img = canvas.toDataURL('image/jpeg', options.imageQuality)
    doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
    drawSubsystemLegend(doc, 'fire', pageW - margin.right - mmToPt(60), pageH - margin.bottom - mmToPt(70))
    drawFooter(pageNum)
    pageNum++
  } else if (subsystem === 'parking') {
    await drawHeader('Sistema Parquímetro')
    const canvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'parking')
    const img = canvas.toDataURL('image/jpeg', options.imageQuality)
    doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
    drawSubsystemLegend(doc, 'parking', pageW - margin.right - mmToPt(55), pageH - margin.bottom - mmToPt(60))
    drawFooter(pageNum)
    pageNum++

    // Pagina de detalle
    doc.addPage()
    await drawHeader('Detalle de Grupo de Parquímetros')
    
    // Calcular bounding box
    const devs = project.parkingDevices || []
    if (devs.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      devs.forEach(d => {
        if (d.x < minX) minX = d.x
        if (d.x > maxX) maxX = d.x
        if (d.y < minY) minY = d.y
        if (d.y > maxY) maxY = d.y
      })
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2

      // Render map for cropping with 2x resolution and zoomLevel 2 to apply UX typography rules
      const zoomCanvas = await renderDesignCanvas(project, targetPxW * 2, targetPxH * 2, 'parking', 2)
      const t = (zoomCanvas as any)._transform
      const mapX = t ? Math.round(t.offsetX + cx * t.scale) : Math.round(cx * (zoomCanvas.width / EXPORT_BASE_W))
      const mapY = t ? Math.round(t.offsetY + cy * t.scale) : Math.round(cy * (zoomCanvas.height / EXPORT_BASE_H))
      
      // Dado que el canvas ya está renderizado al doble de resolución (targetPxW * 2),
      // tomamos el área de pixeles exacta que se va a mostrar en el PDF para lograr el Zoom 2x sin pérdida de calidad.
        const cropPxW = Math.round((availW / 72) * 400)
        const cropPxH = Math.round(((availH / 2) / 72) * 400)
      
      const crop = cropAround(zoomCanvas, mapX, mapY, cropPxW, cropPxH)
      const cropImg = crop.toDataURL('image/jpeg', options.imageQuality)
      
      doc.addImage(cropImg, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH / 2)
      
      // Detalle texto
      let startY = margin.top + headerHeightPt + (availH / 2) + mmToPt(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Lista de Dispositivos', margin.left, startY)
      startY += mmToPt(8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      
      devs.forEach((d, idx) => {
        const typeStr = d.type === 'barrier' || d.type.startsWith('barrier') ? 'Barrera' : d.type === 'parking_meter' ? 'Parquímetro' : d.type === 'magnetic_loop' ? 'Lazo Magnético' : 'Lector/UHF'
        doc.text(`${idx + 1}. ${d.name} (${typeStr})`, margin.left, startY)
        if (d.type === 'parking_meter') {
           const method = d.paymentMethod || 'mixto'
           const comm = d.communication || '4g'
           const mid = d.municipalId ? ` | ID: ${d.municipalId}` : ''
           doc.text(`   Pago: ${method} | Com: ${comm}${mid}`, margin.left, startY + mmToPt(4))
           startY += mmToPt(4)
        }
        startY += mmToPt(6)
      })
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.text('No hay dispositivos de parquímetro.', margin.left, margin.top + headerHeightPt + mmToPt(20))
    }
    
    drawFooter(pageNum)
    pageNum++
  } else if (subsystem === 'cam_individual') {
    const cams = project.cameras
    for (let i = 0; i < cams.length; i += 2) {
      if (i > 0) doc.addPage()
      await drawHeader('Cámaras Individuales')
      const c1 = cams[i]
      const c2 = cams[i + 1]
      const gutterPt = mmToPt(12)
      const blockWpt = (availW - gutterPt) / 2
      const blockHpt = availH - mmToPt(12)
      const blockY = margin.top + headerHeightPt + mmToPt(8)
      const leftX = margin.left
      const rightX = margin.left + blockWpt + gutterPt
      const paddingPt = mmToPt(4)
      const titleHpt = mmToPt(10)
      const cropHpt = blockHpt - titleHpt - mmToPt(26)
      const innerWpt = blockWpt - paddingPt * 2
      const cropPxW = Math.round((innerWpt / 72) * 400)
      const cropPxH = Math.round((cropHpt / 72) * 400)
      const leftFill = '#f6f8fb'
      const rightFill = '#f8f6fb'
      const border = '#d9dee8'
      const headerLeft = '#eaf0ff'
      const headerRight = '#f0eaff'
      if (c1) {
        doc.setDrawColor(border)
        doc.setFillColor(leftFill)
        doc.roundedRect(leftX, blockY, blockWpt, blockHpt, 4, 4, 'F')
        doc.setFillColor(headerLeft)
        doc.rect(leftX, blockY, blockWpt, titleHpt, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(`Cámara ${i + 1}: ${c1.name}`, leftX + paddingPt, blockY + titleHpt - mmToPt(3))
        const camCanvas = await renderSingleCameraCanvas(project, targetPxW, targetPxH, c1.id)
        const c1Point = mapPointToCanvas(camCanvas, c1.x, c1.y)
        const crop1 = cropAround(camCanvas, c1Point.x, c1Point.y, cropPxW, cropPxH)
        const img1 = crop1.toDataURL('image/jpeg', options.imageQuality)
        doc.addImage(img1, 'JPEG', leftX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
      }
      if (c2) {
        doc.setDrawColor(border)
        doc.setFillColor(rightFill)
        doc.roundedRect(rightX, blockY, blockWpt, blockHpt, 4, 4, 'F')
        doc.setFillColor(headerRight)
        doc.rect(rightX, blockY, blockWpt, titleHpt, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(`Cámara ${i + 2}: ${c2.name}`, rightX + paddingPt, blockY + titleHpt - mmToPt(3))
        const camCanvas2 = await renderSingleCameraCanvas(project, targetPxW, targetPxH, c2.id)
        const c2Point = mapPointToCanvas(camCanvas2, c2.x, c2.y)
        const crop2 = cropAround(camCanvas2, c2Point.x, c2Point.y, cropPxW, cropPxH)
        const img2 = crop2.toDataURL('image/jpeg', options.imageQuality)
        doc.addImage(img2, 'JPEG', rightX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
      }
      drawFooter(pageNum)
      pageNum++
    }
  }
  return doc
}

export async function exportSubsystemPdf(project: ExportProjectData, options: PdfOptions, subsystem: ExportSubsystem, filename: string) {
  const doc = await buildSubsystemPdfDocument(project, options, subsystem, filename)
  doc.save(filename)
}

export async function generateSubsystemPreviewUrl(
  project: ExportProjectData,
  options: PdfOptions,
  subsystem: ExportSubsystem,
  filename: string
) {
  const doc = await buildSubsystemPdfDocument(project, options, subsystem, filename)
  return createPdfPreviewUrlFromDoc(doc)
}

export async function buildMultipleSubsystemsPdfDocument(
  project: ExportProjectData,
  options: PdfOptions,
  subsystems: ExportSubsystem[],
  filename: string
) {
  // Validación previa por subsistema. Reutilizamos la misma ruta que en
  // exportSubsystemPdf para mantener una única fuente de verdad.
  for (const sub of subsystems) {
    const validation = runExportValidation(project, sub)
    if (validation.issues.length > 0) {
      logValidationIssues(validation, `exportMultipleSubsystemsPdf(${sub})`)
    }
  }
  const doc = new jsPDF({
    orientation: options.orientation,
    format: options.format,
    unit: 'pt',
    hotfixes: ['px_scaling'],
  })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = {
    top: mmToPt(options.marginTop),
    right: mmToPt(options.marginRight),
    bottom: mmToPt(options.marginBottom),
    left: mmToPt(options.marginLeft),
  }
  const headerHeightPt = mmToPt(22)
  doc.setProperties({
    title: (options.title || project.projectTitle || 'Documento') + ' - Múltiples Sistemas',
    subject: options.subject || '',
    author: options.author || project.author || '',
    creator: project.companyName || 'CCTV Planner Pro',
  })
  const today = new Date()
  const dateTimeStr = formatDateTime(today)
  function drawFooter(pageNum: number) {
    const leftY = pageH - margin.bottom - mmToPt(8)
    const author = project.author || options.author || ''
    const docTitle = options.title || project.projectTitle || 'Documento'
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(author, margin.left, leftY)
    doc.text(docTitle, margin.left, leftY + mmToPt(5))
    const rightText = `${dateTimeStr} • Página ${pageNum}`
    const tw = doc.getTextWidth(rightText)
    doc.text(rightText, pageW - margin.right - tw, pageH - margin.bottom)
  }
  async function drawHeader(subtitle: string) {
    const logoW = mmToPt(30)
    const logoH = mmToPt(12)
    if (project.logoDataUrl) {
      try {
        const im = new Image()
        await new Promise<void>((res) => { im.onload = () => res(); im.onerror = () => res(); im.src = project.logoDataUrl! })
        const aspect = (im.naturalWidth || im.width || 1) / Math.max(1, (im.naturalHeight || im.height || 1))
        let drawW = logoW
        let drawH = drawW / aspect
        if (drawH > logoH) { drawH = logoH; drawW = drawH * aspect }
        doc.addImage(project.logoDataUrl!, 'PNG', margin.left, margin.top, drawW, drawH)
      } catch {}
    }
    const company = project.companyName || options.companyName || ''
    const titleText = (project.projectTitle || options.projectTitle || options.title || 'Proyecto') + (subtitle ? ` • ${subtitle}` : '')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const companyWidth = doc.getTextWidth(company)
    doc.text(company, (pageW - companyWidth) / 2, margin.top + mmToPt(6))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const projWidth = doc.getTextWidth(titleText)
    doc.text(titleText, (pageW - projWidth) / 2, margin.top + mmToPt(12))
    doc.setLineWidth(0.5)
    doc.line(margin.left, margin.top + headerHeightPt, pageW - margin.right, margin.top + headerHeightPt)
  }
  const availW = pageW - margin.left - margin.right
  const availH = pageH - margin.top - headerHeightPt - margin.bottom
  const imageDpi = subsystems.length >= 4 ? 240 : subsystems.length >= 2 ? 280 : 400
  const targetPxW = Math.round((availW / 72) * imageDpi)
  const targetPxH = Math.round((availH / 72) * imageDpi)
  // TOC calculation
  let runningPage = 2
  const toc: Array<{ title: string; page: number | string }> = []
  subsystems.forEach(ss => {
    let label = ''
    let pages = 1
    
    if (ss === 'cctv') label = 'CCTV'
    else if (ss === 'access') label = 'Control de Acceso'
    else if (ss === 'voceo') label = 'Voceo'
    else if (ss === 'fire') label = 'Incendio'
    else if (ss === 'cam_individual') label = 'Cámaras Individuales'
    else if (ss === 'parking') label = 'Sistema Parquímetro'
    
    if (ss === 'cam_individual') {
      pages = Math.max(1, Math.ceil((project.cameras?.length ?? 0) / 2))
      if (pages > 1) {
        toc.push({ title: label, page: `${runningPage} - ${runningPage + pages - 1}` })
      } else {
        toc.push({ title: label, page: runningPage })
      }
    } else if (ss === 'access') {
      const devCount = project.accessDevices?.length ?? 0
      const kitPages = getAccessDetailPageCount(devCount)
      toc.push({ title: label, page: runningPage })
      if (kitPages > 0) {
        if (kitPages > 1) toc.push({ title: 'Kit Control de Acceso (Individuales)', page: `${runningPage + 1} - ${runningPage + kitPages}` })
        else toc.push({ title: 'Kit Control de Acceso (Individuales)', page: runningPage + 1 })
      }
      pages = 1 + kitPages
    } else if (ss === 'parking') {
      toc.push({ title: 'Sistema de Parquímetro', page: runningPage })
      toc.push({ title: 'Detalle de Grupo de Parquímetros', page: runningPage + 1 })
      pages = 2
    } else {
      toc.push({ title: label, page: runningPage })
    }
    
    runningPage += pages
  })
  const ok = await addCoverPageToDoc(doc, project, options, filename, toc)
  if (!ok) throw new Error('No se pudo generar la portada')
  let pageNum = 2
  let firstContent = true
  for (const subsystem of subsystems) {
    if (!firstContent) doc.addPage()
    firstContent = false
    if (subsystem === 'cctv') {
      await drawHeader('CCTV (solo cámaras)')
      const canvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'cams')
      const img = canvas.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
      drawSubsystemLegend(doc, 'cctv', pageW - margin.right - mmToPt(45), pageH - margin.bottom - mmToPt(50))
      drawFooter(pageNum)
      pageNum++
    } else if (subsystem === 'access') {
      await drawHeader('Control de Acceso')
      const proj: ExportProjectData = { ...project, floorPlan: project.floorPlanAccess ?? project.floorPlan }
      const canvas = await renderDesignCanvas(proj, targetPxW, targetPxH, 'access')
      const img = canvas.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
      drawSubsystemLegend(doc, 'access', pageW - margin.right - mmToPt(55), pageH - margin.bottom - mmToPt(60))
      drawFooter(pageNum)
      pageNum++
      pageNum = await appendAccessGroupPages({
        doc,
        project: proj,
        options,
        availW,
        availH,
        margin,
        headerHeightPt,
        imageDpi,
        pageNum,
        drawHeader,
        drawFooter,
      })
    } else if (subsystem === 'voceo') {
      await drawHeader('Voceo / Llamado de Enfermeras')
      const proj: ExportProjectData = { ...project, floorPlan: project.floorPlanVoceo ?? project.floorPlan }
      const canvas = await renderDesignCanvas(proj, targetPxW, targetPxH, 'voceo')
      const img = canvas.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
      drawSubsystemLegend(doc, 'voceo', pageW - margin.right - mmToPt(55), pageH - margin.bottom - mmToPt(60))
      drawFooter(pageNum)
      pageNum++
    } else if (subsystem === 'fire') {
      await drawHeader('Sistema Contra Incendios')
      const proj: ExportProjectData = { ...project, floorPlan: project.floorPlanFire ?? project.floorPlan }
      const canvas = await renderDesignCanvas(proj, targetPxW, targetPxH, 'fire')
      const img = canvas.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
      drawSubsystemLegend(doc, 'fire', pageW - margin.right - mmToPt(60), pageH - margin.bottom - mmToPt(70))
      drawFooter(pageNum)
      pageNum++
    } else if (subsystem === 'parking') {
      await drawHeader('Sistema Parquímetro')
      const canvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'parking')
      const img = canvas.toDataURL('image/jpeg', options.imageQuality)
      doc.addImage(img, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH)
      drawSubsystemLegend(doc, 'parking', pageW - margin.right - mmToPt(55), pageH - margin.bottom - mmToPt(60))
      drawFooter(pageNum)
      pageNum++

      // Pagina de detalle
      doc.addPage()
      await drawHeader('Detalle de Grupo de Parquímetros')
      
      const devs = project.parkingDevices || []
      if (devs.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        devs.forEach(d => {
          if (d.x < minX) minX = d.x
          if (d.x > maxX) maxX = d.x
          if (d.y < minY) minY = d.y
          if (d.y > maxY) maxY = d.y
        })
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2

        // Render map for cropping with 2x resolution and zoomLevel 2 to apply UX typography rules
        const zoomCanvas = await renderDesignCanvas(project, targetPxW * 2, targetPxH * 2, 'parking', 2)
        const t = (zoomCanvas as any)._transform
        const mapX = t ? Math.round(t.offsetX + cx * t.scale) : Math.round(cx * (zoomCanvas.width / EXPORT_BASE_W))
        const mapY = t ? Math.round(t.offsetY + cy * t.scale) : Math.round(cy * (zoomCanvas.height / EXPORT_BASE_H))
        
        // Dado que el canvas ya está renderizado al doble de resolución (targetPxW * 2),
        // tomamos el área de pixeles exacta que se va a mostrar en el PDF para lograr el Zoom 2x sin pérdida de calidad.
        const cropPxW = Math.round((availW / 72) * 400)
        const cropPxH = Math.round(((availH / 2) / 72) * 400)
        
        const crop = cropAround(zoomCanvas, mapX, mapY, cropPxW, cropPxH)
        const cropImg = crop.toDataURL('image/jpeg', options.imageQuality)
        
        doc.addImage(cropImg, 'JPEG', margin.left, margin.top + headerHeightPt, availW, availH / 2)
        
        let startY = margin.top + headerHeightPt + (availH / 2) + mmToPt(10)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Lista de Dispositivos', margin.left, startY)
        startY += mmToPt(8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        devs.forEach((d, idx) => {
          let typeStr = d.type === 'barrier' || d.type.startsWith('barrier') ? 'Barrera' : d.type === 'parking_meter' ? 'Parquímetro' : d.type === 'magnetic_loop' ? 'Lazo Magnético' : 'Lector/UHF'
          
          // Corrección específica para el sensor de masa vehicular y nomenclaturas WJDG/WGGD
          if (d.name.includes('WJDG') || d.name.includes('WGGD')) {
             typeStr = 'Sensor de masa vehicular'
             // Limpiar el nombre si tiene un sufijo innecesario "- #" cuando es WJDG/WGGD
             d.name = d.name.replace(/\s*-\s*\d+$/, '')
          } else if (d.name.includes('LM6') || d.type === 'magnetic_loop') {
             typeStr = 'Lazo magnético para detección'
             d.name = d.name.replace(/\s*-\s*\d+$/, '')
          }
          
          doc.text(`${idx + 1}. ${d.name} (${typeStr})`, margin.left, startY)
          if (d.type === 'parking_meter') {
             const method = d.paymentMethod || 'mixto'
             const comm = d.communication || '4g'
             const mid = d.municipalId ? ` | ID: ${d.municipalId}` : ''
             doc.text(`   Pago: ${method} | Com: ${comm}${mid}`, margin.left, startY + mmToPt(4))
             startY += mmToPt(4)
          }
          startY += mmToPt(6)
        })
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        doc.text('No hay dispositivos de parquímetro.', margin.left, margin.top + headerHeightPt + mmToPt(20))
      }
      
      drawFooter(pageNum)
      pageNum++
    } else if (subsystem === 'cam_individual') {
      const cams = project.cameras
      for (let i = 0; i < cams.length; i += 2) {
        if (i > 0) doc.addPage()
        await drawHeader('Cámaras Individuales')
        const c1 = cams[i]
        const c2 = cams[i + 1]
        const gutterPt = mmToPt(12)
        const blockWpt = (availW - gutterPt) / 2
        const blockHpt = availH - mmToPt(12)
        const blockY = margin.top + headerHeightPt + mmToPt(8)
        const leftX = margin.left
        const rightX = margin.left + blockWpt + gutterPt
        const paddingPt = mmToPt(4)
        const titleHpt = mmToPt(10)
        const cropHpt = blockHpt - titleHpt - mmToPt(26)
        const innerWpt = blockWpt - paddingPt * 2
        const cropPxW = Math.round((innerWpt / 72) * imageDpi)
        const cropPxH = Math.round((cropHpt / 72) * imageDpi)
        const leftFill = '#f6f8fb'
        const rightFill = '#f8f6fb'
        const border = '#d9dee8'
        const headerLeft = '#eaf0ff'
        const headerRight = '#f0eaff'
        if (c1) {
          doc.setDrawColor(border)
          doc.setFillColor(leftFill)
          doc.roundedRect(leftX, blockY, blockWpt, blockHpt, 4, 4, 'F')
          doc.setFillColor(headerLeft)
          doc.rect(leftX, blockY, blockWpt, titleHpt, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(12)
          doc.text(`Cámara ${i + 1}: ${c1.name}`, leftX + paddingPt, blockY + titleHpt - mmToPt(3))
          const camCanvas = await renderSingleCameraCanvas(project, targetPxW, targetPxH, c1.id)
          const c1Point = mapPointToCanvas(camCanvas, c1.x, c1.y)
          const crop1 = cropAround(camCanvas, c1Point.x, c1Point.y, cropPxW, cropPxH)
          const img1 = crop1.toDataURL('image/jpeg', options.imageQuality)
          doc.addImage(img1, 'JPEG', leftX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
        }
        if (c2) {
          doc.setDrawColor(border)
          doc.setFillColor(rightFill)
          doc.roundedRect(rightX, blockY, blockWpt, blockHpt, 4, 4, 'F')
          doc.setFillColor(headerRight)
          doc.rect(rightX, blockY, blockWpt, titleHpt, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(12)
          doc.text(`Cámara ${i + 2}: ${c2.name}`, rightX + paddingPt, blockY + titleHpt - mmToPt(3))
          const camCanvas2 = await renderSingleCameraCanvas(project, targetPxW, targetPxH, c2.id)
          const c2Point = mapPointToCanvas(camCanvas2, c2.x, c2.y)
          const crop2 = cropAround(camCanvas2, c2Point.x, c2Point.y, cropPxW, cropPxH)
          const img2 = crop2.toDataURL('image/jpeg', options.imageQuality)
          doc.addImage(img2, 'JPEG', rightX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
        }
        drawFooter(pageNum)
        pageNum++
      }
    }
  }
  return doc
}

export async function exportMultipleSubsystemsPdf(
  project: ExportProjectData,
  options: PdfOptions,
  subsystems: ExportSubsystem[],
  filename: string
) {
  const doc = await buildMultipleSubsystemsPdfDocument(project, options, subsystems, filename)
  doc.save(filename)
}

export async function generateMultipleSubsystemsPreviewUrl(
  project: ExportProjectData,
  options: PdfOptions,
  subsystems: ExportSubsystem[],
  filename: string
) {
  const doc = await buildMultipleSubsystemsPdfDocument(project, options, subsystems, filename)
  return createPdfPreviewUrlFromDoc(doc)
}

/**
 * Ejecuta la validación del proyecto contra el subsistema solicitado.
 * Filtra los issues que NO aplican al subsistema (por ejemplo, cámaras
 * no son relevantes al validar el subsistema de incendio). Devuelve
 * siempre un ValidationResult, nunca lanza.
 */
function runExportValidation(project: ExportProjectData, subsystem: string): ValidationResult {
  const baseResult = validateExportProject(project)
  const kinds = (() => {
    switch (subsystem) {
      case 'cctv':
      case 'cam_individual':
        return new Set(['cameras'])
      case 'access':
        return new Set(['accessDevices'])
      case 'voceo':
        return new Set(['voceoDevices'])
      case 'fire':
        return new Set(['fireDevices'])
      case 'parking':
        return new Set(['parkingDevices'])
      default:
        return new Set([
          'cameras', 'accessDevices', 'voceoDevices', 'fireDevices', 'parkingDevices',
        ])
    }
  })()
  const issues = baseResult.issues.filter(i => !i.kind || kinds.has(i.kind))
  return { ok: !issues.some(x => x.level === 'error'), issues }
}

/**
 * Emite un log estructurado de los issues encontrados. Se hace a través
 * de una función para que los tests puedan interceptar o reemplazar el
 * comportamiento sin depender de console.warn.
 */
function logValidationIssues(result: ValidationResult, context: string) {
  if (typeof window !== 'undefined') return
  if (typeof console === 'undefined') return
  for (const i of result.issues) {
    const tag = `[exportValidation:${i.level}] ${context} - ${i.code}`
    console.warn(tag, i.message)
  }
}
