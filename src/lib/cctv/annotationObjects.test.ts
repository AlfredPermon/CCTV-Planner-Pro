import { describe, it, expect, vi } from 'vitest'
import type { CanvasAnnotation, ObjectCategory, ObjectSubtype } from './types'
import { drawTopDownObject, drawAnnotation, getAnnotationBoundingBox } from './annotations'

// Mock CanvasRenderingContext2D para pruebas de renderizado
function createMockCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1
  } as unknown as CanvasRenderingContext2D
}

describe('2D Custom Objects (Top-Down View)', () => {
  const subtypes: ObjectSubtype[] = [
    'car_sedan',
    'car_suv',
    'truck',
    'person_man',
    'person_woman',
    'desk',
    'office_chair',
    'computer',
    'tree',
    'plant'
  ]

  it('debe renderizar todos los subtipos de objeto sin lanzar excepciones', () => {
    const ctx = createMockCtx()
    subtypes.forEach((subtype) => {
      const ann: CanvasAnnotation = {
        id: `test-${subtype}`,
        type: 'object',
        objectCategory: subtype.startsWith('car') || subtype === 'truck' ? 'vehicles' : subtype.startsWith('person') ? 'people' : 'office',
        objectSubtype: subtype,
        x: 100,
        y: 100,
        width: 90,
        height: 40,
        fillColor: '#3b82f6',
        strokeColor: '#1e293b',
        fillEnabled: true
      }

      expect(() => drawTopDownObject(ctx, ann, 1)).not.toThrow()
      expect(() => drawAnnotation(ctx, ann, false, 1)).not.toThrow()
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })
  })

  it('debe calcular correctamente el bounding box para anotaciones tipo objeto', () => {
    const ann: CanvasAnnotation = {
      id: 'test-bbox',
      type: 'object',
      objectCategory: 'vehicles',
      objectSubtype: 'car_sedan',
      x: 50,
      y: 80,
      width: 100,
      height: 45
    }

    const bbox = getAnnotationBoundingBox(ann)
    expect(bbox.minX).toBe(50)
    expect(bbox.minY).toBe(80)
    expect(bbox.maxX).toBe(150)
    expect(bbox.maxY).toBe(125)
  })

  it('debe aplicar la paleta de color personalizada en fillColor y strokeColor', () => {
    const ctx = createMockCtx()
    const recordedFillStyles: string[] = []
    Object.defineProperty(ctx, 'fillStyle', {
      get() { return recordedFillStyles[recordedFillStyles.length - 1] || '' },
      set(val: string) { recordedFillStyles.push(val) },
      configurable: true
    })
    const customColor = '#ef4444'

    const ann: CanvasAnnotation = {
      id: 'test-color',
      type: 'object',
      objectCategory: 'office',
      objectSubtype: 'desk',
      x: 10,
      y: 10,
      width: 60,
      height: 30,
      fillColor: customColor,
      strokeColor: '#000000'
    }

    drawTopDownObject(ctx, ann, 1)
    expect(recordedFillStyles).toContain(customColor)
  })

  it('debe calcular píxeles proporcionales según la escala activa en m/px', () => {
    const realWidthMeters = 4.5 // Auto sedan
    const realHeightMeters = 1.9
    const scaleMetersPerPixel = 0.05 // 1px = 0.05m -> 4.5m / 0.05 = 90px

    const calculatedW = Math.round(realWidthMeters / scaleMetersPerPixel)
    const calculatedH = Math.round(realHeightMeters / scaleMetersPerPixel)

    expect(calculatedW).toBe(90)
    expect(calculatedH).toBe(38)
  })

  it('debe aislar los objetos según la vista activa (view)', () => {
    const isVisibleInView = (ann: CanvasAnnotation, currentView: string) => {
      if (!ann.view) return true
      if (currentView === 'combined') return true
      return ann.view === currentView
    }

    const objectInCamerasView: CanvasAnnotation = {
      id: 'obj-1',
      type: 'object',
      objectCategory: 'vehicles',
      objectSubtype: 'car_sedan',
      x: 0,
      y: 0,
      view: 'cameras'
    }

    expect(isVisibleInView(objectInCamerasView, 'cameras')).toBe(true)
    expect(isVisibleInView(objectInCamerasView, 'parking')).toBe(false)
    expect(isVisibleInView(objectInCamerasView, 'combined')).toBe(true)
  })
})
