import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ACCESS_LABEL_FONT_COLOR,
  DEFAULT_ACCESS_LABEL_FONT_FAMILY,
  DEFAULT_ACCESS_LABEL_FONT_SIZE,
  computeAccessExportLabelFontSize,
  getAccessCanvasLabelLayout,
  resolveAccessLabelFontColor,
  resolveAccessLabelFontFamily,
  resolveAccessLabelFontSize,
} from '@/lib/access/device'

describe('access label defaults compartidos', () => {
  it('aplica fallback de tamaño, fuente y color', () => {
    expect(resolveAccessLabelFontSize(undefined)).toBe(DEFAULT_ACCESS_LABEL_FONT_SIZE)
    expect(resolveAccessLabelFontFamily('')).toBe(DEFAULT_ACCESS_LABEL_FONT_FAMILY)
    expect(resolveAccessLabelFontColor('')).toBe(DEFAULT_ACCESS_LABEL_FONT_COLOR)
  })

  it('garantiza tamaño mínimo legible en canvas y export', () => {
    expect(resolveAccessLabelFontSize(7)).toBeGreaterThanOrEqual(10)
    expect(computeAccessExportLabelFontSize(1, 7)).toBeGreaterThan(6)
  })

  it('mantiene offsets y amplía el hit-area al layout real de la etiqueta', () => {
    const layout = getAccessCanvasLabelLayout({
      x: 320,
      y: 240,
      textWidth: 42,
      viewportScale: 2,
      fontSize: 8,
      labelOffsetX: 14,
      labelOffsetY: -22,
    })

    expect(layout.centerX).toBe(334)
    expect(layout.centerY).toBe(218)
    expect(layout.width).toBeGreaterThan(21)
    expect(layout.height).toBeGreaterThan(5)
    expect(layout.left).toBeLessThan(layout.centerX)
    expect(layout.right).toBeGreaterThan(layout.centerX)
    expect(layout.top).toBeLessThan(layout.centerY)
    expect(layout.bottom).toBeGreaterThan(layout.centerY)
  })
})
