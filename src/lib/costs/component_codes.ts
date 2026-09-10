import { Sistema } from './types'

export const COMPONENT_CODES: Record<Sistema, string[]> = {
  CCTV: ['CCTV_CABLE', 'CCTV_CONECTOR', 'CCTV_FUENTE', 'CCTV_CANAL'],
  ACCESO: ['ACC_CABLE', 'ACC_CONTROLADORA', 'ACC_CERRADURA', 'ACC_FUENTE'],
  VOCEO: ['VOC_CABLE', 'VOC_AMPLIFICADOR', 'VOC_FUENTE', 'VOC_ALTAVOZ'],
  INCENDIO: ['FIR_CABLE', 'FIR_PANEL', 'FIR_MODULO', 'FIR_SIRENA'],
}

export function getRequiredCodes(input: {
  cctv?: unknown
  acceso?: unknown
  voceo?: unknown
  incendio?: unknown
}) {
  const codes = new Set<string>()
  if (input.cctv) COMPONENT_CODES.CCTV.forEach((c) => codes.add(c))
  if (input.acceso) COMPONENT_CODES.ACCESO.forEach((c) => codes.add(c))
  if (input.voceo) COMPONENT_CODES.VOCEO.forEach((c) => codes.add(c))
  if (input.incendio) COMPONENT_CODES.INCENDIO.forEach((c) => codes.add(c))
  return Array.from(codes)
}

export function getCodeCategory(code: string): { sistema: Sistema; categoria: string } {
  if (code.startsWith('CCTV_')) {
    if (code === 'CCTV_CABLE') return { sistema: 'CCTV', categoria: 'CABLE' }
    if (code === 'CCTV_CONECTOR') return { sistema: 'CCTV', categoria: 'CONECTOR' }
    if (code === 'CCTV_FUENTE') return { sistema: 'CCTV', categoria: 'FUENTE' }
    if (code === 'CCTV_CANAL') return { sistema: 'CCTV', categoria: 'CANAL' }
  }
  if (code.startsWith('ACC_')) {
    if (code === 'ACC_CABLE') return { sistema: 'ACCESO', categoria: 'CABLE' }
    if (code === 'ACC_CONTROLADORA') return { sistema: 'ACCESO', categoria: 'CONTROLADORA' }
    if (code === 'ACC_CERRADURA') return { sistema: 'ACCESO', categoria: 'CERRADURA' }
    if (code === 'ACC_FUENTE') return { sistema: 'ACCESO', categoria: 'FUENTE' }
  }
  if (code.startsWith('VOC_')) {
    if (code === 'VOC_CABLE') return { sistema: 'VOCEO', categoria: 'CABLE' }
    if (code === 'VOC_AMPLIFICADOR') return { sistema: 'VOCEO', categoria: 'AMPLIFICADOR' }
    if (code === 'VOC_FUENTE') return { sistema: 'VOCEO', categoria: 'FUENTE' }
    if (code === 'VOC_ALTAVOZ') return { sistema: 'VOCEO', categoria: 'ALTAVOZ' }
  }
  if (code.startsWith('FIR_')) {
    if (code === 'FIR_CABLE') return { sistema: 'INCENDIO', categoria: 'CABLE' }
    if (code === 'FIR_PANEL') return { sistema: 'INCENDIO', categoria: 'PANEL' }
    if (code === 'FIR_MODULO') return { sistema: 'INCENDIO', categoria: 'MODULO' }
    if (code === 'FIR_SIRENA') return { sistema: 'INCENDIO', categoria: 'SIRENA' }
  }
  // Fallback: inferir por prefijo si no es uno de los requeridos
  const pref = code.split('_')[0]
  if (pref === 'CCTV') return { sistema: 'CCTV', categoria: 'GENERAL' }
  if (pref === 'ACC') return { sistema: 'ACCESO', categoria: 'GENERAL' }
  if (pref === 'VOC') return { sistema: 'VOCEO', categoria: 'GENERAL' }
  if (pref === 'FIR') return { sistema: 'INCENDIO', categoria: 'GENERAL' }
  return { sistema: 'CCTV', categoria: 'GENERAL' }
}
