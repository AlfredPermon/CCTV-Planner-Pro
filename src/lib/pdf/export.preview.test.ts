import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildMultipleSubsystemsPdfDocument,
  buildSubsystemPdfDocument,
  generateMultipleSubsystemsPreviewUrl,
  generateSubsystemPreviewUrl,
  type ExportProjectData,
  type PdfOptions,
} from './export'

type MockCtx = {
  save: () => void
  restore: () => void
  translate: (x: number, y: number) => void
  rotate: (a: number) => void
  scale: (x: number, y: number) => void
  transform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  fillRect: (x: number, y: number, w: number, h: number) => void
  fillText: (text: string, x: number, y: number) => void
  drawImage: (...args: any[]) => void
  beginPath: () => void
  arc: (x: number, y: number, r: number, a0: number, a1: number) => void
  closePath: () => void
  fill: () => void
  stroke: () => void
  strokeRect: (...args: any[]) => void
  strokeText: () => void
  moveTo: (...args: any[]) => void
  lineTo: (...args: any[]) => void
  quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => void
  bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => void
  roundRect: (...args: any[]) => void
  ellipse: (...args: any[]) => void
  putImageData: () => void
  createImageData: (w: number, h: number) => ImageData
  getImageData: (x: number, y: number, w: number, h: number) => ImageData
  measureText: (t: string) => { width: number }
  set fillStyle(v: string)
  set strokeStyle(v: string)
  set lineWidth(v: number)
  set font(v: string)
  set textAlign(v: string)
  set textBaseline(v: string)
  set imageSmoothingEnabled(v: boolean)
  set imageSmoothingQuality(v: string)
}

function makeMockCtx(): MockCtx {
  return {
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    scale: () => undefined,
    transform: () => undefined,
    setTransform: () => undefined,
    fillRect: () => undefined,
    fillText: () => undefined,
    drawImage: () => undefined,
    beginPath: () => undefined,
    arc: () => undefined,
    closePath: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    strokeRect: () => undefined,
    strokeText: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    quadraticCurveTo: () => undefined,
    bezierCurveTo: () => undefined,
    roundRect: () => undefined,
    ellipse: () => undefined,
    putImageData: () => undefined,
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb' } as unknown as ImageData),
    getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb' } as unknown as ImageData),
    measureText: (t) => ({ width: t.length * 6 }),
    set fillStyle(_v: string) { /* noop */ },
    set strokeStyle(_v: string) { /* noop */ },
    set lineWidth(_v: number) { /* noop */ },
    set font(_v: string) { /* noop */ },
    set textAlign(_v: string) { /* noop */ },
    set textBaseline(_v: string) { /* noop */ },
    set imageSmoothingEnabled(_v: boolean) { /* noop */ },
    set imageSmoothingQuality(_v: string) { /* noop */ },
  }
}

function makeMockCanvas(): HTMLCanvasElement {
  const ctx = makeMockCtx()
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/jpeg;base64,ZmFrZQ==',
  } as unknown as HTMLCanvasElement
}

function installCanvasStub() {
  ;(globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`unexpected tag ${tag}`)
      return makeMockCanvas()
    },
  }
}

function uninstallCanvasStub() {
  delete (globalThis as any).document
}

function baseProject(): ExportProjectData {
  return {
    floorPlan: null,
    floorPlanAccess: null,
    floorPlanVoceo: null,
    floorPlanFire: null,
    floorPlanParking: null,
    cameras: [],
    accessDevices: [],
    voceoDevices: [],
    fireDevices: [],
    parkingDevices: [],
    iconScales: {},
  }
}

function baseOptions(): PdfOptions {
  return {
    orientation: 'portrait',
    format: 'a4',
    marginTop: 15,
    marginRight: 12,
    marginBottom: 15,
    marginLeft: 12,
    imageQuality: 0.92,
    title: 'Preview parity',
    coverEnabled: false,
  }
}

describe('preview PDF – paridad con el pipeline de exportación', () => {
  beforeEach(() => {
    installCanvasStub()
  })

  afterEach(() => {
    uninstallCanvasStub()
    vi.restoreAllMocks()
  })

  it('preview de un subsistema genera un PDF válido con la misma paginación base del export', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      cameras: [
        { id: 'cam-1', name: 'Cam 1', type: 'dome', x: 120, y: 180, rotation: 0, fov: 90, resolution: '1080p', iconKey: 'dome' },
      ],
    }
    let capturedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob
      return 'blob:preview-cctv'
    })
    vi.stubGlobal('URL', { ...URL, createObjectURL })

    const doc = await buildSubsystemPdfDocument(project, baseOptions(), 'cctv', 'CCTV.pdf')
    const previewUrl = await generateSubsystemPreviewUrl(project, baseOptions(), 'cctv', 'CCTV.pdf')

    expect(previewUrl).toBe('blob:preview-cctv')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(doc.getNumberOfPages()).toBe(1)
    expect(capturedBlob).toBeInstanceOf(Blob)
    expect(capturedBlob!.size).toBeGreaterThan(100)
    const signature = new TextDecoder().decode((await capturedBlob!.arrayBuffer()).slice(0, 4))
    expect(signature).toBe('%PDF')
  })

  it('preview múltiple respeta la misma cantidad de páginas que el export combinado', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      cameras: [
        { id: 'cam-1', name: 'Cam 1', type: 'dome', x: 100, y: 100, rotation: 0, fov: 90, resolution: '1080p', iconKey: 'dome' },
      ],
      fireDevices: [
        { id: 'fire-1', name: 'Detector 1', type: 'smoke_detector', x: 600, y: 420, rotation: 0, iconKey: 'smoke_detector' },
      ],
    }
    let capturedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob
      return 'blob:preview-multi'
    })
    vi.stubGlobal('URL', { ...URL, createObjectURL })

    const doc = await buildMultipleSubsystemsPdfDocument(
      project,
      { ...baseOptions(), orientation: 'landscape' },
      ['cctv', 'fire'],
      'Sistemas_Seleccionados.pdf'
    )
    const previewUrl = await generateMultipleSubsystemsPreviewUrl(
      project,
      { ...baseOptions(), orientation: 'landscape' },
      ['cctv', 'fire'],
      'Sistemas_Seleccionados.pdf'
    )

    expect(previewUrl).toBe('blob:preview-multi')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(doc.getNumberOfPages()).toBe(2)
    expect(capturedBlob).toBeInstanceOf(Blob)
    expect(capturedBlob!.size).toBeGreaterThan(150)
  })

  it('control de acceso mantiene una sola página de kit para grupos de hasta 10 accesos', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      accessDevices: [
        { id: 'ad-1', name: 'SenseFace 7A - 1', type: 'terminal', x: 120, y: 120, rotation: 0, iconKey: 'terminal' },
        { id: 'ad-2', name: 'MAG600BZ - 2', type: 'lock', x: 220, y: 180, rotation: 0, iconKey: 'lock' },
        { id: 'ad-3', name: 'K11 - 3', type: 'exit_button', x: 320, y: 240, rotation: 0, iconKey: 'exit_button' },
        { id: 'ad-4', name: 'SS2422EX-ES - 4', type: 'lock', x: 420, y: 300, rotation: 0, iconKey: 'lock' },
        { id: 'ad-5', name: 'BZL600N - 5', type: 'terminal', x: 520, y: 360, rotation: 0, iconKey: 'terminal' },
        { id: 'ad-6', name: 'SenseFace 7A - 6', type: 'terminal', x: 620, y: 420, rotation: 0, iconKey: 'terminal' },
        { id: 'ad-7', name: 'MAG600BZ - 7', type: 'lock', x: 720, y: 480, rotation: 0, iconKey: 'lock' },
        { id: 'ad-8', name: 'K11 - 8', type: 'exit_button', x: 820, y: 540, rotation: 0, iconKey: 'exit_button' },
        { id: 'ad-9', name: 'SS2422EX-ES - 9', type: 'lock', x: 920, y: 600, rotation: 0, iconKey: 'lock' },
        { id: 'ad-10', name: 'BZL600N - 10', type: 'terminal', x: 1020, y: 660, rotation: 0, iconKey: 'terminal' },
      ],
    }

    const doc = await buildSubsystemPdfDocument(project, baseOptions(), 'access', 'Acceso.pdf')

    expect(doc.getNumberOfPages()).toBe(2)
  })
})
