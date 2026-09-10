/**
 * Tests de validación espacial: confirman que las coordenadas de cada
 * dispositivo en el PDF coinciden con sus coordenadas originales en el
 * lienzo 2D con un margen de error máximo del 1% (COORD_TOLERANCE_PCT).
 *
 * Cubre los 6 tipos de dispositivos soportados:
 *  - cameras
 *  - accessDevices
 *  - voceoDevices
 *  - fireDevices
 *  - parkingDevices
 *  - cam_individual (mapeo de cámaras individuales)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  renderDesignCanvas,
  type ExportProjectData,
} from './export'
import {
  validateExportProject,
  projectDeviceToCanvas,
  coordErrorPct,
  validateFloorPlanAspect,
  BASE_W,
  BASE_H,
  COORD_TOLERANCE_PCT,
} from './exportValidation'
import { DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE } from '@/lib/access/device'

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
  let tx = 0
  let ty = 0
  const ctx: MockCtx = {
    save: () => { tx = 0; ty = 0 },
    restore: () => { tx = 0; ty = 0 },
    translate: (x, y) => { tx += x; ty += y },
    rotate: () => undefined,
    scale: () => undefined,
    transform: () => undefined,
    setTransform: () => undefined,
    fillRect: (x, y, w, h) => undefined,
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
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: y, colorSpace: 'srgb' } as unknown as ImageData),
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
  return ctx
}

function makeMockCanvas(): HTMLCanvasElement {
  const ctx = makeMockCtx()
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,',
    _ctx: ctx,
  } as unknown as HTMLCanvasElement
}

function installCanvasStub() {
  ;(globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`unexpected tag ${tag}`)
      return makeMockCanvas()
    },
  }
  ;(globalThis as any).Image = class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    crossOrigin = ''
    private _src = ''
    get src() { return this._src }
    set src(v: string) {
      this._src = v
      setTimeout(() => this.onload?.(), 0)
    }
  }
}

function uninstallCanvasStub() {
  delete (globalThis as any).document
  delete (globalThis as any).Image
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

/**
 * Helper: dado un proyecto y un modo, ejecuta el renderDesignCanvas y
 * devuelve el deviceMap que adjuntamos al canvas. Verifica que las
 * coordenadas destino coincidan con las calculadas analíticamente
 * dentro del 1% de tolerancia.
 */
async function runAndAssertSpatialFidelity(
  project: ExportProjectData,
  mode: 'all' | 'cams' | 'devices' | 'access' | 'voceo' | 'fire' | 'parking',
  targetW: number,
  targetH: number
) {
  const canvas = await renderDesignCanvas(project, targetW, targetH, mode)
  const t = (canvas as any)._transform
  const deviceMap = (canvas as any)._deviceMap as Array<{
    id: string
    kind: string
    origX: number
    origY: number
    canvasX: number
    canvasY: number
  }>
  expect(t).toBeDefined()
  expect(deviceMap).toBeDefined()

  for (const d of deviceMap) {
    const expected = projectDeviceToCanvas(d.origX, d.origY, targetW, targetH)
    const err = coordErrorPct(
      { x: expected.x, y: expected.y },
      { x: d.canvasX, y: d.canvasY },
      targetW,
      targetH
    )
    expect(err.max, `Dispositivo ${d.id} (${d.kind}) excede tolerancia`).toBeLessThanOrEqual(COORD_TOLERANCE_PCT)
    // Verificación adicional: la diferencia absoluta no debe exceder 2 píxeles
    // (que es 1% en un lienzo de 200px o mayor)
    const dxAbs = Math.abs(expected.x - d.canvasX)
    const dyAbs = Math.abs(expected.y - d.canvasY)
    expect(dxAbs).toBeLessThanOrEqual(2)
    expect(dyAbs).toBeLessThanOrEqual(2)
  }
  return { canvas, deviceMap, transform: t }
}

describe('validación espacial – fidelidad de coordenadas (margen 1%)', () => {
  beforeEach(() => { installCanvasStub() })
  afterEach(() => { uninstallCanvasStub() })

  const targets: Array<[number, number]> = [
    [800, 600],
    [1200, 900],
    [1600, 1200],
    [2480, 3508], // A4 vertical
    [3508, 2480], // A4 horizontal
  ]

  for (const [targetW, targetH] of targets) {
    it(`cámaras: posiciones preservadas en ${targetW}x${targetH}`, async () => {
      const project: ExportProjectData = {
        ...baseProject(),
        cameras: [
          { id: 'c1', name: 'C1', type: 'dome', x: 50, y: 50, fov: 90, rotation: 0, resolution: '1080p', iconKey: 'dome' },
          { id: 'c2', name: 'C2', type: 'bullet', x: 400, y: 300, fov: 60, rotation: 0, resolution: '4k', iconKey: 'bullet' },
          { id: 'c3', name: 'C3', type: 'ptz', x: 750, y: 580, fov: 360, rotation: 45, resolution: '4k', iconKey: 'ptz' },
        ],
      }
      await runAndAssertSpatialFidelity(project, 'cams', targetW, targetH)
    })

    it(`accessDevices: posiciones preservadas en ${targetW}x${targetH}`, async () => {
      const project: ExportProjectData = {
        ...baseProject(),
        accessDevices: [
          { id: 'a1', type: 'terminal', name: 'T1', x: 100, y: 100, rotation: 0, iconKey: 'terminal' },
          { id: 'a2', type: 'lock', name: 'L1', x: 300, y: 200, rotation: 0, iconKey: 'lock' },
          { id: 'a3', type: 'exit_button', name: 'B1', x: 500, y: 400, rotation: 0, iconKey: 'exit_button' },
        ],
      }
      await runAndAssertSpatialFidelity(project, 'access', targetW, targetH)
    })

    it(`voceoDevices: posiciones preservadas en ${targetW}x${targetH}`, async () => {
      const project: ExportProjectData = {
        ...baseProject(),
        voceoDevices: [
          { id: 'v1', type: 'speaker', name: 'S1', x: 200, y: 200, rotation: 0, iconKey: 'speaker' },
          { id: 'v2', type: 'horn', name: 'H1', x: 500, y: 350, rotation: 0, iconKey: 'horn' },
          { id: 'v3', type: 'panel', name: 'P1', x: 700, y: 100, rotation: 0, iconKey: 'panel' },
        ],
      }
      await runAndAssertSpatialFidelity(project, 'voceo', targetW, targetH)
    })

    it(`fireDevices: posiciones preservadas en ${targetW}x${targetH}`, async () => {
      const project: ExportProjectData = {
        ...baseProject(),
        fireDevices: [
          { id: 'f1', type: 'smoke_detector', name: 'SD1', x: 150, y: 150, rotation: 0, iconKey: 'smoke_detector' },
          { id: 'f2', type: 'manual_station', name: 'MS1', x: 350, y: 300, rotation: 0, iconKey: 'manual_station' },
          { id: 'f3', type: 'horn_strobe', name: 'HS1', x: 600, y: 450, rotation: 0, iconKey: 'horn_strobe' },
        ],
      }
      await runAndAssertSpatialFidelity(project, 'fire', targetW, targetH)
    })

    it(`parkingDevices: posiciones preservadas en ${targetW}x${targetH}`, async () => {
      const project: ExportProjectData = {
        ...baseProject(),
        parkingDevices: [
          { id: 'p1', type: 'barrier', name: 'B1', x: 200, y: 250, rotation: 0, iconKey: 'barrier' },
          { id: 'p2', type: 'uhf_reader', name: 'UHF1', x: 450, y: 400, rotation: 0, iconKey: 'uhf_reader' },
          { id: 'p3', type: 'parking_meter', name: 'PM1', x: 700, y: 500, rotation: 0, iconKey: 'parking_meter' },
        ],
      }
      await runAndAssertSpatialFidelity(project, 'parking', targetW, targetH)
    })
  }

  it('modo "all" agrega dispositivos de todos los tipos en un solo deviceMap', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      cameras: [{ id: 'c1', name: 'C1', type: 'dome', x: 100, y: 100, fov: 90, rotation: 0, resolution: '1080p', iconKey: 'dome' }],
      accessDevices: [{ id: 'a1', type: 'terminal', name: 'T1', x: 200, y: 200, rotation: 0, iconKey: 'terminal' }],
      voceoDevices: [{ id: 'v1', type: 'speaker', name: 'S1', x: 300, y: 300, rotation: 0, iconKey: 'speaker' }],
      fireDevices: [{ id: 'f1', type: 'smoke_detector', name: 'SD1', x: 400, y: 400, rotation: 0, iconKey: 'smoke_detector' }],
      parkingDevices: [{ id: 'p1', type: 'barrier', name: 'B1', x: 500, y: 500, rotation: 0, iconKey: 'barrier' }],
    }
    const { deviceMap } = await runAndAssertSpatialFidelity(project, 'all', 1600, 1200)
    const kinds = new Set(deviceMap.map(d => d.kind))
    expect(kinds.has('camera')).toBe(true)
    expect(kinds.has('access')).toBe(true)
    expect(kinds.has('voceo')).toBe(true)
    expect(kinds.has('fire')).toBe(true)
    expect(kinds.has('parking')).toBe(true)
  })

  it('dispositivos en bordes mantienen tolerancia espacial relevante en A4 horizontal', async () => {
    const targetW = 3508
    const targetH = 2480
    const project: ExportProjectData = {
      ...baseProject(),
      cameras: [
        { id: 'cam-tl', name: 'TL', type: 'dome', x: 0, y: 0, fov: 90, rotation: 0, resolution: '1080p', iconKey: 'dome' },
        { id: 'cam-br', name: 'BR', type: 'bullet', x: 800, y: 600, fov: 90, rotation: 180, resolution: '4k', iconKey: 'bullet' },
      ],
      accessDevices: [
        { id: 'acc-tr', type: 'terminal', name: 'TR', x: 800, y: 0, rotation: 0, iconKey: 'terminal' },
      ],
      parkingDevices: [
        { id: 'pk-bl', type: 'parking_meter', name: 'BL', x: 0, y: 600, rotation: 0, iconKey: 'parking_meter' },
      ],
    }
    const { deviceMap } = await runAndAssertSpatialFidelity(project, 'all', targetW, targetH)
    for (const point of deviceMap) {
      expect(point.canvasX).toBeGreaterThanOrEqual(0)
      expect(point.canvasX).toBeLessThanOrEqual(targetW)
      expect(point.canvasY).toBeGreaterThanOrEqual(0)
      expect(point.canvasY).toBeLessThanOrEqual(targetH)
    }
  })

  it('escalado uniforme preserva la separación relativa con plano específico del subsistema', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      floorPlanAccess: {
        url: '/access.png',
        width: 1600,
        height: 1200,
      },
      accessDevices: [
        { id: 'a-left', type: 'terminal', name: 'Lado Izq', x: 50, y: 60, rotation: 0, iconKey: 'terminal' },
        { id: 'a-right', type: 'lock', name: 'Lado Der', x: 750, y: 540, rotation: 0, iconKey: 'lock' },
      ],
    }
    const targetW = 2480
    const targetH = 3508
    const { deviceMap, transform } = await runAndAssertSpatialFidelity(project, 'access', targetW, targetH)
    const left = deviceMap.find(device => device.id === 'a-left')
    const right = deviceMap.find(device => device.id === 'a-right')
    expect(left).toBeDefined()
    expect(right).toBeDefined()
    expect(right!.canvasX - left!.canvasX).toBeCloseTo((750 - 50) * transform.scale, 1)
    expect(right!.canvasY - left!.canvasY).toBeCloseTo((540 - 60) * transform.scale, 1)
  })
})

describe('validación previa – detección de issues', () => {
  it('proyecto vacío: ok=true sin issues', () => {
    const r = validateExportProject(baseProject())
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
  })

  it('dispositivo con coordenadas inválidas (NaN) → error', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      cameras: [
        { id: 'c1', name: 'C1', type: 'dome', x: Number.NaN, y: 100, fov: 90, rotation: 0, resolution: '1080p', iconKey: 'dome' },
      ],
    }
    const r = validateExportProject(project)
    expect(r.ok).toBe(false)
    expect(r.issues.some(i => i.code === 'INVALID_COORDS')).toBe(true)
  })

  it('dispositivo fuera del lienzo → warning OUT_OF_BOUNDS', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      accessDevices: [
        { id: 'a1', type: 'terminal', name: 'T1', x: 2000, y: 1500, rotation: 0, iconKey: 'terminal' },
      ],
    }
    const r = validateExportProject(project)
    expect(r.issues.some(i => i.code === 'OUT_OF_BOUNDS_X')).toBe(true)
    expect(r.issues.some(i => i.code === 'OUT_OF_BOUNDS_Y')).toBe(true)
  })

  it('tipo de dispositivo desconocido → warning UNKNOWN_TYPE', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      fireDevices: [
        { id: 'f1', type: 'inventado', name: 'X1', x: 200, y: 200, rotation: 0, iconKey: 'x' },
      ],
    }
    const r = validateExportProject(project)
    expect(r.issues.some(i => i.code === 'UNKNOWN_TYPE')).toBe(true)
  })

  it('plano con aspect ratio muy diferente al destino → warning ASPECT_RATIO_DRIFT', () => {
    const issues = validateFloorPlanAspect(
      { width: 4000, height: 1000 }, // aspect 4:1
      800, 600
    )
    expect(issues.some(i => i.code === 'ASPECT_RATIO_DRIFT')).toBe(true)
  })

  it('plano con aspect ratio similar → sin warnings', () => {
    const issues = validateFloorPlanAspect(
      { width: 1600, height: 1200 },
      800, 600
    )
    expect(issues).toEqual([])
  })

  it('plano con dimensiones inválidas → error', () => {
    const issues = validateFloorPlanAspect({ width: 0, height: 0 }, 800, 600)
    expect(issues.some(i => i.level === 'error' && i.code === 'INVALID_PLANE_DIMS')).toBe(true)
  })

  it('plano con escala inválida → error INVALID_SCALE_REFERENCE', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      floorPlanParking: {
        url: '/parking.png',
        width: 1024,
        height: 768,
        scaleMetersPerPixel: 0,
      },
      parkingDevices: [
        { id: 'pk-1', type: 'parking_meter', name: 'PK1', x: 200, y: 200, rotation: 0, iconKey: 'parking_meter' },
      ],
    }
    const result = validateExportProject(project)
    expect(result.ok).toBe(false)
    expect(result.issues.some(i => i.code === 'INVALID_SCALE_REFERENCE' && i.field === 'floorPlanParking')).toBe(true)
  })

  it('subsistemas con escalas incoherentes → warning INCONSISTENT_SCALE_REFERENCE', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      floorPlan: {
        url: '/cctv.png',
        width: 800,
        height: 600,
        scaleMetersPerPixel: 0.01,
      },
      floorPlanAccess: {
        url: '/access.png',
        width: 800,
        height: 600,
        scaleMetersPerPixel: 0.03,
      },
      cameras: [
        { id: 'c1', name: 'C1', type: 'dome', x: 100, y: 100, fov: 90, rotation: 0, resolution: '1080p', iconKey: 'dome' },
      ],
      accessDevices: [
        { id: 'a1', type: 'terminal', name: 'A1', x: 100, y: 100, rotation: 0, iconKey: 'terminal' },
      ],
    }
    const result = validateExportProject(project)
    expect(result.issues.some(i => i.code === 'INCONSISTENT_SCALE_REFERENCE')).toBe(true)
  })

  it('etiqueta fuera del área visible → warning DEVICE_LABEL_CLIPPED', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      parkingDevices: [
        {
          id: 'pk-edge',
          type: 'parking_meter',
          name: 'Etiqueta extremadamente larga en el borde',
          x: 790,
          y: 20,
          rotation: 0,
          iconKey: 'parking_meter',
          labelOffsetY: -30,
          labelFontSize: 10,
        },
      ],
    }
    const result = validateExportProject(project)
    expect(result.issues.some(i => i.code === 'DEVICE_LABEL_CLIPPED' && i.deviceId === 'pk-edge')).toBe(true)
  })

  it('accessDevices con fuente menor al mínimo compartido → warning LABEL_FONT_TOO_SMALL', () => {
    const project: ExportProjectData = {
      ...baseProject(),
      accessDevices: [
        {
          id: 'acc-small-font',
          type: 'terminal',
          name: 'Acceso Principal',
          x: 220,
          y: 180,
          rotation: 0,
          iconKey: 'terminal',
          fontSize: DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE - 1,
        },
      ],
    }
    const result = validateExportProject(project)
    expect(result.issues.some(i => i.code === 'LABEL_FONT_TOO_SMALL' && i.deviceId === 'acc-small-font')).toBe(true)
  })

  it('proyecto sin plano (null) → sin issues de aspect', () => {
    expect(validateFloorPlanAspect(null, 800, 600)).toEqual([])
  })
})

describe('projectDeviceToCanvas – función pura de transformación', () => {
  it('lienzo cuadrado: scale uniforme', () => {
    const p = projectDeviceToCanvas(400, 300, 800, 800)
    expect(p.scale).toBe(0.5)
    expect(p.offsetX).toBe(0)
    expect(p.offsetY).toBe(125)
  })

  it('A4 horizontal: device en (400,300) cae a coords destino correctas', () => {
    const p = projectDeviceToCanvas(400, 300, 3508, 2480)
    const s = Math.min(3508 / BASE_W, 2480 / BASE_H)
    const expectedX = Math.round(((3508 - BASE_W * s) / 2) + 400 * s)
    const expectedY = Math.round(((2480 - BASE_H * s) / 2) + 300 * s)
    expect(p.x).toBe(expectedX)
    expect(p.y).toBe(expectedY)
  })

  it('coordErrorPct: cero error cuando los puntos coinciden', () => {
    const e = coordErrorPct({ x: 100, y: 200 }, { x: 100, y: 200 }, 1000, 1000)
    expect(e.x).toBe(0)
    expect(e.y).toBe(0)
    expect(e.max).toBe(0)
  })

  it('coordErrorPct: 10px de error en 1000px = 1%', () => {
    const e = coordErrorPct({ x: 100, y: 200 }, { x: 110, y: 200 }, 1000, 1000)
    expect(e.x).toBeCloseTo(0.01, 6)
    expect(e.y).toBe(0)
    expect(e.max).toBeCloseTo(0.01, 6)
  })
})
