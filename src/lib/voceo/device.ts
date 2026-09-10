import type { CatalogModel } from '@/lib/catalog/types'
import { normalizeString } from '@/lib/device/utils'

export type VoceoDeviceType =
  | 'speaker_ceiling'
  | 'speaker_wall'
  | 'horn'
  | 'gateway'
  | 'amplifier'
  | 'microphone'
  | 'panel'
  | 'nurse_call'
  | 'beacon'
  // Legacy backward compatibility fallbacks
  | 'speaker'

export type VoceoIconKey = string

/**
 * Normaliza el texto de búsqueda para inferencia de dispositivos
 */
function normalizeHaystack(model: Pick<CatalogModel, 'marca' | 'modelo' | 'codigo' | 'descripcion' | 'notas'>): string {
  return normalizeString(
    `${model.marca} ${model.modelo} ${model.codigo} ${model.descripcion ?? ''} ${model.notas ?? ''}`
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  )
}

export function inferVoceoDeviceType(
  model: Pick<CatalogModel, 'marca' | 'modelo' | 'codigo' | 'descripcion' | 'notas'>
): VoceoDeviceType {
  const haystack = normalizeHaystack(model)

  // 1. Gateways / Módulos IP / Placas PCB / Módulos de audio OEM
  if (
    haystack.includes('GATEWAY') ||
    haystack.includes('PA3F') ||
    haystack.includes('PA2') ||
    haystack.includes('INTERFAZ') ||
    haystack.includes('PCB') ||
    haystack.includes('IPAC') ||
    haystack.includes('CA88') ||
    haystack.includes('MODULO OEM') ||
    haystack.includes('PLACA PCB')
  ) {
    return 'gateway'
  }

  // 2. Cornetas / Sirenas / Altavoces de exterior / alta potencia
  if (
    haystack.includes('CORNETA') ||
    haystack.includes('HORN') ||
    haystack.includes('EXTERIOR') ||
    haystack.includes('INTEMPERIE') ||
    haystack.includes('SIRENA') ||
    haystack.includes('ALTA POTENCIA') ||
    haystack.includes('SXWE')
  ) {
    return 'horn'
  }

  // 3. Micrófonos / Consolas de voceo / PTT / Cuello de ganso
  if (
    haystack.includes('MICROFONO') ||
    haystack.includes('MICRO') ||
    haystack.includes('MIC') ||
    haystack.includes('CONSOLA') ||
    haystack.includes('A32I') ||
    haystack.includes('GOOSENECK') ||
    haystack.includes('DESK')
  ) {
    return 'microphone'
  }

  // 4. Amplificadores / Etapas de potencia
  if (
    haystack.includes('AMPLIFICADOR') ||
    haystack.includes('AMPLI') ||
    haystack.includes('POTENCIA') ||
    haystack.includes('ETAPA')
  ) {
    return 'amplifier'
  }

  // 5. Luminarias / Señalizadores / Estrobos de voceo
  if (
    haystack.includes('LUMINARIA') ||
    haystack.includes('SEÑALIZ') ||
    haystack.includes('SENALIZ') ||
    haystack.includes('DTL-ENF') ||
    haystack.includes('BEACON') ||
    haystack.includes('ESTROBO')
  ) {
    return 'beacon'
  }

  // 6. Llamado de enfermera / Interfonía hospitalaria
  if (
    haystack.includes('ENFERMERA') ||
    haystack.includes('HOSPITAL') ||
    haystack.includes('RCU-IP') ||
    haystack.includes('RCU') ||
    haystack.includes('LLAMADO')
  ) {
    return 'nurse_call'
  }

  // 7. Paneles de control / Servidores de voceo / Consolas de gestión
  if (
    haystack.includes('PANEL') ||
    haystack.includes('SERVER') ||
    haystack.includes('SERVIDOR') ||
    haystack.includes('PAGING') ||
    haystack.includes('GESTION') ||
    haystack.includes('MATRIZ')
  ) {
    return 'panel'
  }

  // 8. Altavoces / Parlantes de pared (SXW001, gabinete, pared)
  if (
    haystack.includes('PARED') ||
    haystack.includes('WALL') ||
    haystack.includes('GABINETE') ||
    haystack.includes('SOBREPONER') ||
    haystack.includes('SXW001')
  ) {
    return 'speaker_wall'
  }

  // 9. Altavoces / Bocinas de techo (A201, SXC001, empotrado, techo)
  if (
    haystack.includes('TECHO') ||
    haystack.includes('CEILING') ||
    haystack.includes('EMPOTRA') ||
    haystack.includes('A201') ||
    haystack.includes('SXC001') ||
    haystack.includes('BOCINA') ||
    haystack.includes('ALTAVOZ') ||
    haystack.includes('PARLANTE') ||
    haystack.includes('SPEAKER')
  ) {
    return 'speaker_ceiling'
  }

  return 'speaker_ceiling'
}
