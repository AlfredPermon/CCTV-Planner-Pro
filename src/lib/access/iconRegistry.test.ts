import { describe, it, expect, vi } from 'vitest'
import {
  getAccessIconDef,
  isKnownAccessIconKey,
  resolveAccessIconKeyForDevice,
  drawAccessIcon,
  getAccessColor,
  type AccessIconKey
} from '@/lib/access/iconRegistry'
import { inferAccessIconKey } from '@/lib/access/device'

describe('iconRegistry (Control de Acceso)', () => {
  const knownKeys: AccessIconKey[] = [
    'generic',
    'terminal',
    'terminal_face',
    'terminal_fingerprint',
    'reader_card',
    'turnstile',
    'lock',
    'exit_button',
    'emergency_button',
    'key_switch',
    'controller_panel'
  ]

  it('isKnownAccessIconKey: true para todas las keys conocidas', () => {
    for (const k of knownKeys) {
      expect(isKnownAccessIconKey(k)).toBe(true)
    }
  })

  it('isKnownAccessIconKey: false para undefined/null/desconocido', () => {
    expect(isKnownAccessIconKey(undefined)).toBe(false)
    expect(isKnownAccessIconKey(null)).toBe(false)
    expect(isKnownAccessIconKey('nope')).toBe(false)
  })

  it('resolveAccessIconKeyForDevice: respeta iconKey si es conocida', () => {
    expect(resolveAccessIconKeyForDevice({ iconKey: 'terminal_face', type: 'terminal' })).toBe('terminal_face')
    expect(resolveAccessIconKeyForDevice({ iconKey: 'turnstile', type: 'terminal' })).toBe('turnstile')
    expect(resolveAccessIconKeyForDevice({ iconKey: 'key_switch', type: 'lock' })).toBe('key_switch')
  })

  it('inferAccessIconKey: infiere correctamente el icono según el modelo y hardware real', () => {
    expect(inferAccessIconKey({ marca: 'ZKTeco', modelo: 'SpeedFace V5L', codigo: 'SpeedFace V5L' })).toBe('terminal_face')
    expect(inferAccessIconKey({ marca: 'ZKTeco', modelo: 'Senseface 7A', codigo: 'Senseface 7A' })).toBe('terminal_face')
    expect(inferAccessIconKey({ marca: 'ZKTeco', modelo: 'Aegis2000', codigo: 'Aegis2000', descripcion: 'Torniquete de cuerpo completo' })).toBe('turnstile')
    expect(inferAccessIconKey({ marca: 'AccessPro', modelo: 'PROKSC', codigo: 'PROKSC', descripcion: 'Switch con Llave' })).toBe('key_switch')
    expect(inferAccessIconKey({ marca: 'ZKTeco', modelo: 'K11', codigo: 'K11', descripcion: 'Botón de salida sin tocar' })).toBe('exit_button')
    expect(inferAccessIconKey({ marca: 'STI', modelo: 'SS2422EX-ES', codigo: 'SS2422EX-ES', descripcion: 'Botón de emergencia' })).toBe('emergency_button')
    expect(inferAccessIconKey({ marca: 'AccessPro', modelo: 'MAG600BZ', codigo: 'MAG600BZ', descripcion: 'Chapa magnética' })).toBe('lock')
  })

  it('drawAccessIcon: renderiza todos los tipos vectoriales sin lanzar excepciones', () => {
    const mockCtx = {
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
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
      setLineDash: vi.fn()
    } as unknown as CanvasRenderingContext2D

    for (const key of knownKeys) {
      expect(() =>
        drawAccessIcon(mockCtx, {
          iconKey: key,
          state: 'normal',
          iconScale: 1,
          viewportScale: 1,
          rotationDeg: 0
        })
      ).not.toThrow()
    }
  })

  it('getAccessColor: devuelve la paleta de colores correspondiente', () => {
    expect(getAccessColor('terminal_face').primary).toBe('#7c3aed')
    expect(getAccessColor('turnstile').primary).toBe('#475569')
    expect(getAccessColor('exit_button').primary).toBe('#059669')
  })
})
