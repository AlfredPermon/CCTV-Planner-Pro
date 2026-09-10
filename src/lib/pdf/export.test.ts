import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { computeUniformTransform } from './export'

describe('computeUniformTransform', () => {
  it('Caso 1: (800,600)->(1600,600)', () => {
    const { scale, offsetX, offsetY } = computeUniformTransform(800, 600, 1600, 600)
    expect(scale).toBe(1)
    expect(offsetX).toBe(400)
    expect(offsetY).toBe(0)
  })

  it('Caso 2: (800,600)->(1200,900)', () => {
    const { scale, offsetX, offsetY } = computeUniformTransform(800, 600, 1200, 900)
    expect(scale).toBe(1.5)
    expect(offsetX).toBe(0)
    expect(offsetY).toBe(0)
  })

  it('Caso 3: (800,600)->(800,600)', () => {
    const { scale, offsetX, offsetY } = computeUniformTransform(800, 600, 800, 600)
    expect(scale).toBe(1)
    expect(offsetX).toBe(0)
    expect(offsetY).toBe(0)
  })

  it('layout mantiene proporciones', () => {
    const baseW = 800
    const baseH = 600
    const p1 = { x: 100, y: 200 }
    const p2 = { x: 400, y: 500 }
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const ratio = dx / dy

    {
      const { scale, offsetX, offsetY } = computeUniformTransform(baseW, baseH, 1600, 600)
      const tp1 = { x: offsetX + p1.x * scale, y: offsetY + p1.y * scale }
      const tp2 = { x: offsetX + p2.x * scale, y: offsetY + p2.y * scale }
      const tdx = tp2.x - tp1.x
      const tdy = tp2.y - tp1.y
      expect(tdx).toBeCloseTo(dx * scale, 6)
      expect(tdy).toBeCloseTo(dy * scale, 6)
      expect(tdx / tdy).toBeCloseTo(ratio, 6)
    }

    {
      const { scale, offsetX, offsetY } = computeUniformTransform(baseW, baseH, 1200, 900)
      const tp1 = { x: offsetX + p1.x * scale, y: offsetY + p1.y * scale }
      const tp2 = { x: offsetX + p2.x * scale, y: offsetY + p2.y * scale }
      const tdx = tp2.x - tp1.x
      const tdy = tp2.y - tp1.y
      expect(tdx).toBeCloseTo(dx * scale, 6)
      expect(tdy).toBeCloseTo(dy * scale, 6)
      expect(tdx / tdy).toBeCloseTo(ratio, 6)
    }
  })

  it('múltiples resoluciones', () => {
    const baseW = 800
    const baseH = 600
    const a4Portrait = { w: 2480, h: 3508 }
    const a4Landscape = { w: 3508, h: 2480 }

    {
      const { scale, offsetX, offsetY } = computeUniformTransform(baseW, baseH, a4Portrait.w, a4Portrait.h)
      expect(scale).toBeCloseTo(3.1, 6)
      expect(offsetX).toBe(0)
      expect(offsetY).toBe(824)
    }

    {
      const { scale, offsetX, offsetY } = computeUniformTransform(baseW, baseH, a4Landscape.w, a4Landscape.h)
      expect(scale).toBeCloseTo(2480 / 600, 6)
      expect(offsetX).toBe(101)
      expect(Math.abs(offsetY)).toBe(0)
    }
  })
})

describe('renderDesignCanvas with hideFovLines option', () => {
  function makeMockCtx() {
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
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb' }),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb' }),
      measureText: (t: string) => ({ width: t.length * 6 }),
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set lineWidth(_v: number) {},
      set font(_v: string) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
      set imageSmoothingEnabled(_v: boolean) {},
      set imageSmoothingQuality(_v: string) {},
    }
  }

  function makeMockCanvas() {
    const ctx = makeMockCtx()
    return {
      width: 800,
      height: 600,
      getContext: () => ctx,
      toDataURL: () => 'data:image/jpeg;base64,ZmFrZQ==',
    }
  }

  beforeEach(() => {
    ;(globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return makeMockCanvas()
        if (tag === 'div') return { style: {} }
        return {}
      },
    }
  })

  afterEach(() => {
    delete (globalThis as any).document
  })

  it('renders canvas when hideFovLines is true', async () => {
    const { renderDesignCanvas } = await import('./export')
    const projectData = {
      floorPlan: null,
      cameras: [
        {
          id: 'cam1',
          name: 'Cámara Frontal',
          type: 'bullet',
          x: 400,
          y: 300,
          rotation: 45,
          fov: 90,
          resolution: '1080p',
        },
      ],
      hideFovLines: true,
    }
    const canvas = await renderDesignCanvas(projectData as any, 800, 600, 'cams')
    expect(canvas).toBeDefined()
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })

  it('renders canvas when hideFovLines is false', async () => {
    const { renderDesignCanvas } = await import('./export')
    const projectData = {
      floorPlan: null,
      cameras: [
        {
          id: 'cam1',
          name: 'Cámara Frontal',
          type: 'bullet',
          x: 400,
          y: 300,
          rotation: 45,
          fov: 90,
          resolution: '1080p',
        },
      ],
      hideFovLines: false,
    }
    const canvas = await renderDesignCanvas(projectData as any, 800, 600, 'cams')
    expect(canvas).toBeDefined()
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })
})

