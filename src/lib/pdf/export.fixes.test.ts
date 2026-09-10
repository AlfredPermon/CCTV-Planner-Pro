/**
 * Tests de validación para los fixes reportados en la exportación a PDF.
 *
 * Estos tests verifican que:
 *  - Los dispositivos sembrados (cámaras, control de acceso, kit access,
 *    incendio) se renderizan en el canvas del PDF incluso cuando no hay
 *    un plano de fondo disponible.
 *  - El recorte de las páginas "Cámaras Individuales" se centra
 *    correctamente en el marcador de la cámara usando la transformación
 *    `_transform` que `renderDesignCanvas` adjunta al canvas.
 *  - El estado vacío del módulo CCTV muestra un mensaje explícito en
 *    lugar de un canvas en blanco.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  renderDesignCanvas,
  mapPointToCanvas,
  type ExportProjectData,
} from './export'

type MockCtx = {
  fillRectCalls: Array<[number, number, number, number]>
  arcCalls: Array<[number, number, number, number, number]>
  fillTextCalls: Array<[string, number, number]>
  drawImageCalls: number
  hasFillStyle: (color: string) => boolean
  save: () => void
  restore: () => void
  translate: (x: number, y: number) => void
  rotate: (angle: number) => void
  fillRect: (x: number, y: number, w: number, h: number) => void
  beginPath: () => void
  closePath: () => void
  arc: (x: number, y: number, r: number, a0: number, a1: number) => void
  fill: () => void
  stroke: () => void
  fillText: (text: string, x: number, y: number) => void
  drawImage: (...args: any[]) => void
  strokeRect: (...args: any[]) => void
  moveTo: (...args: any[]) => void
  lineTo: (...args: any[]) => void
  roundRect: (...args: any[]) => void
  ellipse: (...args: any[]) => void
  putImageData: (...args: any[]) => void
  strokeText: (...args: any[]) => void
  measureText: (text: string) => { width: number }
  createImageData: (w: number, h: number) => ImageData
  getImageData: (x: number, y: number, w: number, h: number) => ImageData
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
  const fillStyles: string[] = []
  // Pila de traslaciones para reflejar ctx.translate(x, y) en los siguientes
  // drawImage/fillRect/arc/... (el render hace translate(cx, cy) antes de los
  // dibujos, por lo que necesitamos acumular la traslación).
  let tx = 0
  let ty = 0
  const ctx: MockCtx = {
    fillRectCalls: [],
    arcCalls: [],
    fillTextCalls: [],
    drawImageCalls: 0,
    hasFillStyle: (color: string) => fillStyles.includes(color),
    save: () => { tx = 0; ty = 0 },
    restore: () => { tx = 0; ty = 0 },
    translate: (x, y) => { tx += x; ty += y },
    rotate: () => undefined,
    fillRect: (x, y, w, h) => { ctx.fillRectCalls.push([x + tx, y + ty, w, h]) },
    beginPath: () => undefined,
    arc: (x, y, r, a0, a1) => { ctx.arcCalls.push([x + tx, y + ty, r, a0, a1]) },
    closePath: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillText: (t, x, y) => { ctx.fillTextCalls.push([t, x + tx, y + ty]) },
    strokeText: () => undefined,
    measureText: (t: string) => ({ width: t.length * 6 }),
    drawImage: () => { ctx.drawImageCalls++ },
    strokeRect: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    roundRect: () => undefined,
    ellipse: () => undefined,
    putImageData: () => undefined,
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb' } as unknown as ImageData),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: y, colorSpace: 'srgb' } as unknown as ImageData),
    set fillStyle(v: string) { fillStyles.push(v) },
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

function makeMockCanvas(width: number, height: number, imageStub = false): HTMLCanvasElement {
  const ctx = makeMockCtx()
  const canvas: any = {
    width,
    height,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,',
    _ctx: ctx,
  }
  if (imageStub) {
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
  return canvas as HTMLCanvasElement
}

function installCanvasStub(imageStub = true) {
  ;(globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`unexpected tag ${tag}`)
      return makeMockCanvas(0, 0, imageStub)
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

describe('renderDesignCanvas – fixes de exportación a PDF', () => {
  beforeEach(() => {
    installCanvasStub(true)
  })
  afterEach(() => {
    uninstallCanvasStub()
  })

  it('CCTV (solo cámaras) – muestra mensaje de estado vacío cuando no hay plano ni cámaras', async () => {
    const project = baseProject()
    const canvas = await renderDesignCanvas(project, 1200, 900, 'cams')
    const ctx = (canvas as any)._ctx as MockCtx
    const mensaje = ctx.fillTextCalls.find(([t]) => t.includes('cámaras'))
    expect(mensaje, 'Debe dibujarse un mensaje de estado vacío').toBeDefined()
    expect(mensaje![0]).toMatch(/No hay cámaras sembradas/i)
  })

  it('CCTV (solo cámaras) – dibuja el marcador de la cámara aunque NO exista plano de fondo', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      cameras: [
        {
          id: 'cam-1',
          name: 'Cámara 1',
          x: 400,
          y: 300,
          fov: 90,
          rotation: 0,
          type: 'dome',
          resolution: '1080p',
          iconKey: 'dome',
        },
      ],
    }
    const canvas = await renderDesignCanvas(project, 1200, 900, 'cams')
    const ctx = (canvas as any)._ctx as MockCtx
    expect(ctx.arcCalls.length).toBeGreaterThan(0)
    // Verifica que el centro del arc corresponde a la posición mapeada por _transform
    const t = (canvas as any)._transform
    const expectedX = Math.round(t.offsetX + 400 * t.scale)
    const expectedY = Math.round(t.offsetY + 300 * t.scale)
    const arcoCamara = ctx.arcCalls.find(
      ([x, y, r]) => Math.abs(x - expectedX) <= 1 && Math.abs(y - expectedY) <= 1
    )
    expect(arcoCamara, `Debe existir un arc con centro en (${expectedX}, ${expectedY})`).toBeDefined()
  })

  it('Control de Acceso – dibuja dispositivos de acceso aunque NO exista plano de fondo', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      accessDevices: [
        {
          id: 'ad-1',
          type: 'terminal',
          x: 200,
          y: 150,
          rotation: 0,
          name: 'Terminal 1',
          iconKey: 'terminal',
        },
        {
          id: 'ad-2',
          type: 'lock',
          x: 500,
          y: 400,
          rotation: 0,
          name: 'Chapa 1',
          iconKey: 'lock',
        },
        {
          id: 'ad-3',
          type: 'exit_button',
          x: 100,
          y: 500,
          rotation: 0,
          name: 'Salida 1',
          iconKey: 'exit_button',
        },
      ],
    }
    const canvas = await renderDesignCanvas(project, 1200, 900, 'access')
    const ctx = (canvas as any)._ctx as MockCtx
    // Hay al menos 1 fillRect (terminal) y al menos 1 roundRect (lock) o arc (exit_button)
    expect(ctx.fillRectCalls.length + ctx.arcCalls.length).toBeGreaterThan(0)
    const styles = ['#9333ea', '#0ea5e9', '#22c55e']
    const estilosUsados = styles.some(c => ctx.hasFillStyle(c))
    expect(estilosUsados, 'Debe haberse utilizado al menos un color característico de access').toBe(true)
  })

  it('Kit Control de Acceso – renderiza 5 accesos del grupo y mantiene visible BZL600N - 5 aunque NO exista plano de fondo', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      accessDevices: [
        {
          id: 'ad-kit-1',
          type: 'terminal',
          x: 250,
          y: 250,
          rotation: 0,
          name: 'SenseFace 7A - 1',
          iconKey: 'terminal',
        },
        {
          id: 'ad-kit-2',
          type: 'lock',
          x: 550,
          y: 350,
          rotation: 0,
          name: 'MAG600BZ - 2',
          iconKey: 'lock',
        },
        {
          id: 'ad-kit-3',
          type: 'exit_button',
          x: 760,
          y: 280,
          rotation: 0,
          name: 'K11 - 3',
          iconKey: 'exit_button',
        },
        {
          id: 'ad-kit-4',
          type: 'lock',
          x: 420,
          y: 520,
          rotation: 0,
          name: 'SS2422EX-ES - 4',
          iconKey: 'lock',
        },
        {
          id: 'ad-kit-5',
          type: 'terminal',
          x: 880,
          y: 540,
          rotation: 0,
          name: 'BZL600N - 5',
          iconKey: 'terminal',
        },
      ],
    }
    const canvas = await renderDesignCanvas(project, 1200, 900, 'access')
    const ctx = (canvas as any)._ctx as MockCtx
    expect(ctx.fillRectCalls.length + ctx.arcCalls.length).toBeGreaterThanOrEqual(3)
    expect(ctx.fillTextCalls.map(([text]) => text)).toEqual(
      expect.arrayContaining([
        'SenseFace 7A - 1',
        'MAG600BZ - 2',
        'K11 - 3',
        'SS2422EX-ES - 4',
        'BZL600N - 5',
      ])
    )
  })

  it('Sistema Contra Incendios – dibuja los dispositivos aunque NO exista plano de fondo', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      fireDevices: [
        {
          id: 'fd-1',
          type: 'smoke_detector',
          name: 'Detector 1',
          x: 200,
          y: 200,
          rotation: 0,
          iconKey: 'smoke_detector',
        },
        {
          id: 'fd-2',
          type: 'manual_station',
          name: 'Estación 1',
          x: 400,
          y: 400,
          rotation: 0,
          iconKey: 'manual_station',
        },
        {
          id: 'fd-3',
          type: 'horn_strobe',
          name: 'Sirena 1',
          x: 600,
          y: 250,
          rotation: 0,
          iconKey: 'horn_strobe',
        },
      ],
    }
    const canvas = await renderDesignCanvas(project, 1200, 900, 'fire')
    const ctx = (canvas as any)._ctx as MockCtx
    expect(ctx.fillRectCalls.length + ctx.arcCalls.length).toBeGreaterThan(0)
    const coloresFire = ['#ef4444', '#dc2626', '#f97316', '#94a3b8']
    const estilosUsados = coloresFire.some(c => ctx.hasFillStyle(c))
    expect(estilosUsados, 'Debe haberse utilizado al menos un color característico de fire').toBe(true)
  })

  it('Parking – usa el plano específico del subsistema y mantiene dispositivos visibles', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      floorPlanParking: {
        url: 'data:image/png;base64,iVBORw0KGgo=',
        width: 1400,
        height: 900,
      },
      parkingDevices: [
        {
          id: 'pk-1',
          type: 'parking_meter',
          x: 320,
          y: 260,
          rotation: 0,
          iconKey: 'parking_meter',
          name: 'Parquímetro 1',
        },
      ],
    }
    const canvas = await renderDesignCanvas(project, 1200, 900, 'parking')
    const ctx = (canvas as any)._ctx as MockCtx
    expect(ctx.drawImageCalls).toBeGreaterThan(0)
    const mensaje = ctx.fillTextCalls.find(([t]) => /No hay dispositivos de parking/i.test(t))
    expect(mensaje).toBeUndefined()
  })

  it('CCTV con plano y cámaras – sigue dibujando los marcadores de las cámaras sobre el plano', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      floorPlan: {
        url: 'data:image/png;base64,iVBORw0KGgo=',
        width: 800,
        height: 600,
      },
      cameras: [
        {
          id: 'cam-1',
          name: 'Cámara 1',
          x: 200,
          y: 200,
          fov: 90,
          rotation: 0,
          type: 'dome',
          resolution: '1080p',
          iconKey: 'dome',
        },
        {
          id: 'cam-2',
          name: 'Cámara 2',
          x: 600,
          y: 400,
          fov: 60,
          rotation: 0,
          type: 'bullet',
          resolution: '4k',
          iconKey: 'bullet',
        },
      ],
    }
    const canvas = await renderDesignCanvas(project, 1600, 1200, 'cams')
    const ctx = (canvas as any)._ctx as MockCtx
    expect(ctx.drawImageCalls).toBeGreaterThan(0)
    expect(ctx.arcCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('No se dibuja el estado vacío si ya existe un plano de fondo', async () => {
    const project: ExportProjectData = {
      ...baseProject(),
      floorPlan: {
        url: 'data:image/png;base64,iVBORw0KGgo=',
        width: 800,
        height: 600,
      },
    }
    const canvas = await renderDesignCanvas(project, 1200, 900, 'cams')
    const ctx = (canvas as any)._ctx as MockCtx
    const mensaje = ctx.fillTextCalls.find(([t]) => /No hay/.test(t))
    expect(mensaje, 'No debe dibujarse el mensaje vacío si hay plano').toBeUndefined()
  })
})

describe('mapPointToCanvas – recorte de Cámaras Individuales', () => {
  it('Usa _transform cuando está adjunto al canvas', () => {
    const canvas = { width: 2480, height: 3508, _transform: { baseW: 800, baseH: 600, scale: 3.1, offsetX: 0, offsetY: 824 } } as any
    const p = mapPointToCanvas(canvas, 400, 300)
    expect(p.x).toBe(Math.round(0 + 400 * 3.1))
    expect(p.y).toBe(Math.round(824 + 300 * 3.1))
  })

  it('Corrige el caso A4 vertical donde offsetY es grande (regresión bug cam_individual)', () => {
    const canvas = { width: 2480, height: 3508, _transform: { baseW: 800, baseH: 600, scale: 3.1, offsetX: 0, offsetY: 824 } } as any
    const p = mapPointToCanvas(canvas, 400, 300)
    // Fórmula vieja (incorrecta): y = 300 * 3508/600 = 1754
    // Fórmula nueva (correcta): y = 824 + 300*3.1 = 1754
    // (en este caso coinciden por casualidad)
    // Pero para cam.y = 600 (borde inferior de la base) sí difieren:
    const pBottom = mapPointToCanvas(canvas, 400, 600)
    const pBottomWrong = Math.round(600 * 3508 / 600) // = 3508
    expect(pBottom.y).toBe(Math.round(824 + 600 * 3.1)) // 2684
    expect(pBottom.y).not.toBe(pBottomWrong)
  })

  it('Calcula coordenadas correctas para A4 horizontal (offsetX=101)', () => {
    const canvas = { width: 3508, height: 2480, _transform: { baseW: 800, baseH: 600, scale: 2480 / 600, offsetX: 101, offsetY: 0 } } as any
    const p = mapPointToCanvas(canvas, 400, 300)
    expect(p.x).toBe(Math.round(101 + 400 * (2480 / 600)))
    expect(p.y).toBe(Math.round(0 + 300 * (2480 / 600)))
  })

  it('Fallback a la fórmula proporcional cuando NO existe _transform', () => {
    const canvas = { width: 2480, height: 3508 } as any
    const p = mapPointToCanvas(canvas, 400, 300)
    expect(p.x).toBe(Math.round(400 * 2480 / 1600))
    expect(p.y).toBe(Math.round(300 * 3508 / 1100))
  })
})
