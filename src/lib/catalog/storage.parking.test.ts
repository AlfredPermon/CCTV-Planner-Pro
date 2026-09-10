import { describe, it, expect } from 'vitest'
import { addModel, updateModel, deleteModel, getCatalogItems } from './storage'
import type { CatalogModel } from './types'

describe('Storage catálogo: parking', () => {
  it('CRUD básico y validaciones para tipo "parking"', () => {
    const type = 'parking' as const

    const initial = getCatalogItems(type)
    expect(Array.isArray(initial)).toBe(true)
    expect(initial.length).toBeGreaterThan(0)
    const initialCount = initial.length

    const m1: CatalogModel = {
      id: 'pk-1',
      marca: 'MeterCo',
      modelo: 'PM-100',
      codigo: 'PK-001',
      descripcion: 'Parquímetro básico',
      notas: 'IP54'
    }
    addModel(type, m1)
    let items = getCatalogItems(type)
    expect(items.length).toBe(initialCount + 1)
    expect(items.some(i => i.codigo === 'PK-001')).toBe(true)

    const m2: CatalogModel = {
      id: 'pk-2',
      marca: 'MeterCo',
      modelo: 'PM-200',
      codigo: 'PK-002',
      descripcion: 'Parquímetro avanzado',
      notas: ''
    }
    addModel(type, m2)
    items = getCatalogItems(type)
    expect(items.length).toBe(initialCount + 2)

    expect(() => addModel(type, { ...m2, id: 'pk-3', modelo: 'PM-300' })).toThrow() // código duplicado

    expect(() => updateModel(type, 'pk-2', { codigo: '' })).toThrow() // requerido

    expect(() => updateModel(type, 'pk-2', { codigo: 'PK-001' })).toThrow() // unicidad contra pk-1

    updateModel(type, 'pk-2', { descripcion: 'Parquímetro avanzado v2' })
    items = getCatalogItems(type)
    const upd = items.find(i => i.id === 'pk-2')!
    expect(upd.descripcion).toBe('Parquímetro avanzado v2')

    deleteModel(type, 'pk-1')
    items = getCatalogItems(type)
    expect(items.some(i => i.id === 'pk-1')).toBe(false)
  })
})

