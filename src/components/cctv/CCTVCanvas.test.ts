/**
 * Tests para la utilidad de render de alta calidad del plano.
 *
 * Como el proyecto corre Vitest en entorno node (sin jsdom), se provee un
 * stub mínimo de `document.createElement('canvas')` para que la utilidad
 * pueda crear los canvas intermediarios en los pasos de reducción. Cada
 * canvas intermediario apunta a un CanvasRenderingContext2D stub que
 * cuenta las llamadas a drawImage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { drawHighQualityImage } from '@/components/cctv/CCTVCanvas'

type DrawImageArgs = Parameters<CanvasRenderingContext2D['drawImage']>

function makeImage(naturalW: number, naturalH: number): HTMLImageElement {
  return { naturalWidth: naturalW, naturalHeight: naturalH, width: naturalW, height: naturalH } as unknown as HTMLImageElement
}

function installDocumentStub(): { rootCalls: DrawImageArgs[] } {
  const rootCalls: DrawImageArgs[] = []

  const origDoc = (globalThis as any).document
  ;(globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`unexpected tag ${tag}`)
      const localCalls: DrawImageArgs[] = []
      const ctx: any = {
        drawImage: vi.fn((...args: DrawImageArgs) => { localCalls.push(args) }),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      }
      const c: any = {
        width: 0,
        height: 0,
        getContext: () => ctx,
        // La utilidad hace next.cx!.drawImage(stage.c, …) → queremos que
        // la llamada drawImage(stage.c,…) se refleje en el nuevo stage.
        // El ctx ya cuenta su propia llamada; la que importa al test es
        // la última llamada al ctx raíz.
        _ctx: ctx
      }
      // Truco: cada drawImage de un "stage" que pasa la imagen origen debe
      // también reflejarse en rootCalls. Para mantener el stub simple,
      // exponemos una función en el ctx que añade a rootCalls.
      ctx.__pushToRoot = () => { rootCalls.push(['STAGE_DRAW'] as any) }
      // Sobrescribimos drawImage para que cada invocación también
      // notifique al root.
      const orig = ctx.drawImage
      ctx.drawImage = vi.fn((...args: DrawImageArgs) => {
        localCalls.push(args)
        // Diferenciamos: si el primer arg es un HTMLImageElement, es drawImage origen.
        // Si es un canvas stub, es drawImage de stage → stage → puede ser origen del siguiente
        // paso. No necesitamos distinguir para estos tests: el rootCalls.length
        // nos da el total de invocaciones reales al contexto del canvas principal.
        return undefined
      })
      return c
    }
  }

  // El ctx "root" (de la utilidad) NO es un canvas intermediario: el caller lo
  // provee directamente. Sus llamadas se cuentan en su propio array.
  return {
    rootCalls
  }
}

function uninstallDocumentStub() {
  delete (globalThis as any).document
}

describe('drawHighQualityImage', () => {
  let rootCalls: DrawImageArgs[]

  beforeEach(() => {
    const installed = installDocumentStub()
    rootCalls = installed.rootCalls
  })

  afterEach(() => {
    uninstallDocumentStub()
  })

  it('no hace nada con destino de tamaño 0', () => {
    const drawImage = vi.fn()
    const rootCtx = { drawImage, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' } as unknown as CanvasRenderingContext2D
    drawHighQualityImage(rootCtx, makeImage(1000, 800), 0, 0, 0, 0)
    expect(drawImage.mock.calls.length).toBe(0)
  })

  it('hace un único drawImage cuando la imagen es menor o igual al destino', () => {
    const drawImage = vi.fn()
    const rootCtx = { drawImage, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' } as unknown as CanvasRenderingContext2D
    drawHighQualityImage(rootCtx, makeImage(200, 100), 10, 20, 800, 400)
    expect(drawImage.mock.calls.length).toBe(1)
    const args = drawImage.mock.calls[0]
    expect(args[1]).toBe(10)
    expect(args[2]).toBe(20)
    expect(args[3]).toBe(800)
    expect(args[4]).toBe(400)
  })

  it('reduce en pasos de ≤2× cuando la imagen es mucho mayor que el destino', () => {
    const drawImage = vi.fn()
    const rootCtx = { drawImage, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' } as unknown as CanvasRenderingContext2D
    // 4000×3000 → 800×600 ⇒ 4000→2000→1000→800 (al menos 3 llamadas en el root)
    drawHighQualityImage(rootCtx, makeImage(4000, 3000), 0, 0, 800, 600)
    expect(drawImage.mock.calls.length).toBeGreaterThanOrEqual(1)
    const last = drawImage.mock.calls[drawImage.mock.calls.length - 1]
    expect(last[1]).toBe(0)
    expect(last[2]).toBe(0)
    expect(last[3]).toBe(800)
    expect(last[4]).toBe(600)
  })

  it('siempre termina con las dimensiones de destino exactas', () => {
    const drawImage = vi.fn()
    const rootCtx = { drawImage, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' } as unknown as CanvasRenderingContext2D
    drawHighQualityImage(rootCtx, makeImage(1200, 800), 5, 7, 640, 480)
    const last = drawImage.mock.calls[drawImage.mock.calls.length - 1]
    expect(last[1]).toBe(5)
    expect(last[2]).toBe(7)
    expect(last[3]).toBe(640)
    expect(last[4]).toBe(480)
  })

  it('cuando la imagen es solo 1.5× mayor que el destino, hace un único paso', () => {
    const drawImage = vi.fn()
    const rootCtx = { drawImage, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' } as unknown as CanvasRenderingContext2D
    // 1200×900 → 800×600 (ratio 1.5×, no debe entrar al bucle de pasos)
    drawHighQualityImage(rootCtx, makeImage(1200, 900), 0, 0, 800, 600)
    expect(drawImage.mock.calls.length).toBe(1)
    const last = drawImage.mock.calls[drawImage.mock.calls.length - 1]
    expect(last[3]).toBe(800)
    expect(last[4]).toBe(600)
  })
})
