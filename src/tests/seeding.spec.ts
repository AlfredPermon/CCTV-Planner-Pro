import { describe, it, expect } from 'vitest'
import { cloneFloorPlan, createCleanLayer } from '@/lib/seeding'

describe('Seeding utilities', () => {
  it('cloneFloorPlan crea una copia con nuevo id y conserva escala', () => {
    const base = {
      id: 'base-id',
      name: 'Plano Base',
      url: 'data:image/png;base64,xxx',
      width: 1000,
      height: 800,
      scaleMetersPerPixel: 0.05,
      locked: true,
      scalePoints: { ax: 10, ay: 10, bx: 100, by: 100 }
    }
    const clone = cloneFloorPlan(base as any)
    expect(clone.id).not.toEqual(base.id)
    expect(clone.name).toEqual(base.name)
    expect(clone.scaleMetersPerPixel).toEqual(base.scaleMetersPerPixel)
    expect(clone.locked).toEqual(base.locked)
    expect(clone.scalePoints).toEqual(base.scalePoints)
  })

  it('createCleanLayer devuelve lista vacía para capa limpia', () => {
    const devices = [{ id: '1' }, { id: '2' }]
    const cleaned = createCleanLayer(devices)
    expect(cleaned.length).toEqual(0)
  })
})
