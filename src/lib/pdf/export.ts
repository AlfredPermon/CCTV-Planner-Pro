import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'

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
}

function mmToPt(mm: number) {
  return (mm * 72) / 25.4
}

function ptToPx(pt: number, dpi = 96) {
  return (pt / 72) * dpi
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

    const imgData = canvas.toDataURL('image/png', options.imageQuality)
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
      'PNG',
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

export interface ExportProjectData {
  floorPlan: {
    url: string
    width: number
    height: number
    scaleMetersPerPixel?: number
  } | null
  cameras: Array<{
    id: string
    name: string
    type: string
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
    name: string
    x: number
    y: number
    rotation: number
    labelOffsetX?: number
    labelOffsetY?: number
  }>
  iconScales?: Record<string, number>
  companyName?: string
  author?: string
  projectTitle?: string
  version?: string
  logoDataUrl?: string
  cameraDescriptions?: Record<string, string>
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

async function renderDesignCanvas(
  data: ExportProjectData,
  targetW: number,
  targetH: number,
  mode: 'all' | 'cams' | 'devices' = 'all'
) {
  const c = createCanvas(targetW, targetH)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetW, targetH)
  if (data.floorPlan) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = data.floorPlan.url
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => res()
    })
    const aspect = data.floorPlan.width / data.floorPlan.height
    const baseW = 800
    const baseH = 600
    const sx = targetW / baseW
    const sy = targetH / baseH
    let drawWidth = Math.min(700, 800)
    let drawHeight = drawWidth / aspect
    if (drawHeight > 500) {
      drawHeight = 500
      drawWidth = drawHeight * aspect
    }
    const boundsX = 50
    const boundsY = 50
    const bx = boundsX * sx
    const by = boundsY * sy
    const bw = drawWidth * sx
    const bh = drawHeight * sy
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, bx, by, bw, bh)
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = Math.max(1, (2 * (sx + sy)) / 2)
    ctx.strokeRect(bx, by, bw, bh)
    if (mode === 'all' || mode === 'cams') {
      data.cameras.forEach(cam => {
        const cx = cam.x * sx
        const cy = cam.y * sy
        const r = 12 * (data.iconScales?.[cam.id] ?? 1) * ((sx + sy) / 2)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = Math.max(1, r / 6)
        ctx.beginPath()
        const dir = cam.rotation * (Math.PI / 180)
        ctx.moveTo(0, 0)
        ctx.lineTo(r * Math.cos(dir), r * Math.sin(dir))
        ctx.stroke()
        const radius = 120 * ((sx + sy) / 2)
        const half = (cam.fov / 2) * (Math.PI / 180)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, radius, dir - half, dir + half)
        ctx.closePath()
        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)'
        ctx.stroke()
        ctx.restore()
        const lx = cx + ((cam.labelOffsetX ?? 0) * sx)
        const ly = cy + ((cam.labelOffsetY ?? -20) * sy)
        ctx.fillStyle = '#0f172a'
        ctx.font = `${11 * ((sx + sy) / 2)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(cam.name, lx, ly)
      })
    }
    if ((mode === 'all' || mode === 'devices') && data.accessDevices && data.accessDevices.length) {
      data.accessDevices.forEach(dev => {
        const dx = dev.x * sx
        const dy = dev.y * sy
        const iconScale = data.iconScales?.[dev.id] ?? 0.8
        const size = 14 * iconScale * ((sx + sy) / 2)
        const baseColor =
          dev.type === 'terminal' ? '#7c3aed' :
          dev.type === 'lock' ? '#60a5fa' :
          dev.type === 'exit_button' ? '#10b981' :
          '#ef4444'
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
        const lx = dx + ((dev.labelOffsetX ?? 0) * sx)
        const ly = dy + ((dev.labelOffsetY ?? -18) * sy)
        ctx.fillStyle = '#0f172a'
        ctx.font = `${11 * ((sx + sy) / 2)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(dev.name, lx, ly)
      })
    }
  }
  applySharpen(c, 0.4)
  return c
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
  const camsImg = camsCanvas.toDataURL('image/png', options.imageQuality)
  doc.addImage(camsImg, 'PNG', margin.left, margin.top + headerHeightPt, availW, availH)
  drawFooter(1)
  doc.addPage()
  await drawHeader()
  const devCanvas = await renderDesignCanvas(project, targetPxW, targetPxH, 'devices')
  const devImg = devCanvas.toDataURL('image/png', options.imageQuality)
  doc.addImage(devImg, 'PNG', margin.left, margin.top + headerHeightPt, availW, availH)
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
    const mapX = (x: number) => Math.round(x * (designCanvas.width / 800))
    const mapY = (y: number) => Math.round(y * (designCanvas.height / 600))
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
      const img1 = crop1.toDataURL('image/png', options.imageQuality)
      doc.addImage(img1, 'PNG', leftX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
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
      const img2 = crop2.toDataURL('image/png', options.imageQuality)
      doc.addImage(img2, 'PNG', rightX + paddingPt, blockY + titleHpt + paddingPt, innerWpt, cropHpt)
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
