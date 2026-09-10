import { describe, it, expect, vi } from 'vitest'
import {
  drawAnnotation,
  getAnnotationBoundingBox,
  isPointInAnnotation,
  rotatePoint,
  unrotatePoint,
  getAnnotationCenter,
  getAnnotationHandles,
  hitTestAnnotationHandles
} from './annotations'
import type { CanvasAnnotation } from './types'

function makeMockCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textBaseline: 'top',
    textAlign: 'left'
  } as unknown as CanvasRenderingContext2D
}

describe('Annotations Utility - Geometría, Transformaciones e Imágenes/Grupos', () => {
  it('calcula correctamente el centro y rotación de puntos', () => {
    const rect: CanvasAnnotation = {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 100,
      height: 50
    }
    const center = getAnnotationCenter(rect)
    expect(center).toEqual({ cx: 150, cy: 125 })

    // Rotar 90 grados alrededor del centro (150, 125)
    const p = { x: 200, y: 125 } // Punto a la derecha del centro
    const rotated = rotatePoint(p.x, p.y, center.cx, center.cy, 90)
    expect(Math.round(rotated.x)).toBe(150)
    expect(Math.round(rotated.y)).toBe(175)

    // Unrotate debe retornar el punto original
    const unrotated = unrotatePoint(rotated.x, rotated.y, center.cx, center.cy, 90)
    expect(Math.round(unrotated.x)).toBe(200)
    expect(Math.round(unrotated.y)).toBe(125)
  })

  it('calcula bounding box y hit testing para imágenes', () => {
    const imgAnn: CanvasAnnotation = {
      id: 'img-1',
      type: 'image',
      x: 200,
      y: 200,
      width: 160,
      height: 120,
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }

    const box = getAnnotationBoundingBox(imgAnn)
    expect(box).toEqual({ minX: 200, minY: 200, maxX: 360, maxY: 320 })
    expect(isPointInAnnotation(250, 250, imgAnn)).toBe(true)
    expect(isPointInAnnotation(100, 100, imgAnn)).toBe(false)
  })

  it('calcula bounding box consolidado y hit testing para grupos de anotaciones', () => {
    const child1: CanvasAnnotation = { id: 'c1', type: 'square', x: 50, y: 50, width: 40 }
    const child2: CanvasAnnotation = { id: 'c2', type: 'circle', x: 150, y: 150, width: 60 }
    const groupAnn: CanvasAnnotation = {
      id: 'group-1',
      type: 'group',
      x: 50,
      y: 50,
      width: 160,
      height: 160,
      children: [child1, child2]
    }

    const box = getAnnotationBoundingBox(groupAnn)
    expect(box).toEqual({ minX: 50, minY: 50, maxX: 210, maxY: 210 })
    expect(isPointInAnnotation(70, 70, groupAnn)).toBe(true)
    expect(isPointInAnnotation(170, 170, groupAnn)).toBe(true)
    expect(isPointInAnnotation(10, 10, groupAnn)).toBe(false)
  })

  it('obtiene los tiradores de escala y rotación para grupos', () => {
    const child: CanvasAnnotation = { id: 'c1', type: 'square', x: 100, y: 100, width: 50 }
    const groupAnn: CanvasAnnotation = {
      id: 'g1',
      type: 'group',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      children: [child]
    }
    const handles = getAnnotationHandles(groupAnn, 1)
    expect(handles.nw).toBeDefined()
    expect(handles.rotate).toBeDefined()
  })

  it('renderiza imágenes y grupos sin excepciones en Canvas2D Context', () => {
    const ctx = makeMockCtx()
    const groupAnn: CanvasAnnotation = {
      id: 'g1',
      type: 'group',
      x: 0,
      y: 0,
      children: [
        { id: 't1', type: 'text', x: 10, y: 10, text: 'Grupo Texto' }
      ]
    }

    expect(() => drawAnnotation(ctx, groupAnn, true, 1)).not.toThrow()
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })
})
