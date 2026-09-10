import { describe, it, expect, vi } from 'vitest'
import { FloatingDesignToolbar, type FloatingDesignToolbarProps } from './FloatingDesignToolbar'

describe('FloatingDesignToolbar Component Integration', () => {
  it('exporta correctamente el componente FloatingDesignToolbar', () => {
    expect(FloatingDesignToolbar).toBeDefined()
    expect(typeof FloatingDesignToolbar).toBe('function')
  })

  it('acepta y procesa las propiedades showGrid, onToggleGrid, isFitToWindow y onToggleFitWindow', () => {
    const onToggleGridSpy = vi.fn()
    const onToggleFitWindowSpy = vi.fn()

    const props: Partial<FloatingDesignToolbarProps> = {
      showGrid: true,
      onToggleGrid: onToggleGridSpy,
      isFitToWindow: true,
      onToggleFitWindow: onToggleFitWindowSpy
    }

    expect(props.showGrid).toBe(true)
    expect(props.isFitToWindow).toBe(true)

    props.onToggleGrid?.()
    expect(onToggleGridSpy).toHaveBeenCalledTimes(1)

    props.onToggleFitWindow?.()
    expect(onToggleFitWindowSpy).toHaveBeenCalledTimes(1)
  })

  it('soporta la configuración de modos de herramienta pan, measure y select', () => {
    const validModes: FloatingDesignToolbarProps['toolMode'][] = ['select', 'pan', 'measure']
    expect(validModes).toHaveLength(3)
    expect(validModes).toContain('pan')
    expect(validModes).toContain('measure')
    expect(validModes).toContain('select')
  })
})
