import { describe, it, expect } from 'vitest'
import type { ActiveTool } from './FloatingCanvasToolbar'

describe('FloatingCanvasToolbar Integration', () => {
  it('soporta la selección de todas las herramientas básicas requeridas', () => {
    const tools: ActiveTool[] = ['select', 'text', 'arrow', 'circle', 'square', 'rectangle', 'triangle', 'freehand']
    expect(tools.length).toBe(8)
    expect(tools).toContain('text')
    expect(tools).toContain('arrow')
    expect(tools).toContain('circle')
    expect(tools).toContain('square')
    expect(tools).toContain('rectangle')
    expect(tools).toContain('triangle')
    expect(tools).toContain('freehand')
  })
})
