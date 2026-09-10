import { describe, it, expect } from 'vitest'
import {
  createSeededAccessDevice,
  normalizeAccessDevice,
  resolveBaseAccessDeviceName
} from '@/lib/access/accessDeviceFactory'
import {
  DEFAULT_ACCESS_LABEL_FONT_COLOR,
  DEFAULT_ACCESS_LABEL_FONT_FAMILY,
  DEFAULT_ACCESS_LABEL_FONT_SIZE,
} from '@/lib/access/device'

describe('accessDeviceFactory', () => {
  it('resolveBaseAccessDeviceName: mapea tipo → nombre base', () => {
    expect(resolveBaseAccessDeviceName('terminal')).toBe('Terminal')
    expect(resolveBaseAccessDeviceName('lock')).toBe('Chapa Magnética')
    expect(resolveBaseAccessDeviceName('exit_button')).toBe('Botón de Salida')
    expect(resolveBaseAccessDeviceName('emergency_button')).toBe('Botón de Emergencia')
  })

  it('createSeededAccessDevice: usa modelName (trim) y aplica defaults con leyenda', () => {
    const dev = createSeededAccessDevice({
      id: 'dev-1',
      type: 'terminal',
      idx: 3,
      modelId: 'm-1',
      modelName: '  SpeedFace V5L  ',
      iconKey: 'terminal_face',
      withLegend: true
    })

    expect(dev).toMatchObject({
      id: 'dev-1',
      type: 'terminal',
      name: 'SpeedFace V5L - 3',
      modelId: 'm-1',
      modelName: '  SpeedFace V5L  ',
      iconKey: 'terminal_face',
      labelVisible: true,
      labelFontSize: DEFAULT_ACCESS_LABEL_FONT_SIZE,
      labelFontFamily: DEFAULT_ACCESS_LABEL_FONT_FAMILY,
      labelFontColor: DEFAULT_ACCESS_LABEL_FONT_COLOR,
      x: 520,
      y: 320,
      rotation: 0,
      labelOffsetX: 0,
      labelOffsetY: -18
    })
  })

  it('createSeededAccessDevice: usa nombre base cuando modelName no existe y sin leyenda', () => {
    const dev = createSeededAccessDevice({
      id: 'dev-2',
      type: 'lock',
      idx: 1,
      withLegend: false
    })

    expect(dev.name).toBe('Chapa Magnética - 1')
    expect(dev.labelVisible).toBe(false)
  })

  it('normalizeAccessDevice: rellena defaults y calcula labelVisible desde name si falta', () => {
    const d1 = normalizeAccessDevice({ id: 'x', type: 'terminal', name: '  ' })
    expect(d1.name).toBe('  ')
    expect(d1.labelVisible).toBe(false)
    expect(d1.labelFontSize).toBe(DEFAULT_ACCESS_LABEL_FONT_SIZE)
    expect(d1.labelFontFamily).toBe(DEFAULT_ACCESS_LABEL_FONT_FAMILY)

    const d2 = normalizeAccessDevice({ id: 'y', type: 'terminal', name: 'T1' })
    expect(d2.labelVisible).toBe(true)
  })

  it('normalizeAccessDevice: respeta labelVisible explícito aunque name tenga texto', () => {
    const d = normalizeAccessDevice({ id: 'z', type: 'terminal', name: 'T2', labelVisible: false })
    expect(d.labelVisible).toBe(false)
  })

  it('normalizeAccessDevice: reemplaza labelFontFamily vacío por default', () => {
    const d = normalizeAccessDevice({ id: 'ff', type: 'terminal', name: 'T', labelFontFamily: '   ' })
    expect(d.labelFontFamily).toBe(DEFAULT_ACCESS_LABEL_FONT_FAMILY)
  })

  it('normalizeAccessDevice: hace fallback desde fontSize/fontFamily antiguos a labelFontSize/labelFontFamily', () => {
    const d = normalizeAccessDevice({ id: 'old', type: 'terminal', name: 'Legacy', fontSize: 14, fontFamily: 'Arial' })
    expect(d.labelFontSize).toBe(14)
    expect(d.labelFontFamily).toBe('Arial')
  })

  it('normalizeAccessDevice: eleva tamaños heredados demasiado pequeños al mínimo legible', () => {
    const d = normalizeAccessDevice({ id: 'tiny', type: 'terminal', name: 'Mini', labelFontSize: 7 })
    expect(d.labelFontSize).toBeGreaterThanOrEqual(10)
  })
})

