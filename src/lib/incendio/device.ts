import type { CatalogModel } from '@/lib/catalog/types'

export type FireDeviceType =
  | 'panel'
  | 'smoke_detector'
  | 'heat_detector'
  | 'smoke_heat_detector'
  | 'gas_co_detector'
  | 'manual_station'
  | 'explosion_proof_station'
  | 'horn_strobe'
  | 'strobe_light'
  | 'led_indicator'
  | 'module'
  | 'power_supply'
  | 'base'

export type FireIconKey = string

export function inferFireDeviceType(
  model: Pick<CatalogModel, 'marca' | 'modelo' | 'codigo' | 'descripcion' | 'notas'>
): FireDeviceType {
  const haystack = `${model.marca} ${model.modelo} ${model.codigo} ${model.descripcion ?? ''} ${model.notas ?? ''}`
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // 1. Fuentes de poder / Supresores / Baterías
  if (
    haystack.includes('DTK-') ||
    haystack.includes('SUPRESOR') ||
    haystack.includes('ULADA') ||
    haystack.includes('FUENTE') ||
    haystack.includes('BATERIA') ||
    haystack.includes('LK7.') ||
    haystack.includes('POWER SUPPLY')
  ) {
    return 'power_supply'
  }

  // 2. Bases de sensores / Zócalos
  if (
    haystack.includes('HSB-') ||
    haystack.includes('BASE ESTANDAR') ||
    haystack.includes('BASE DE MONTAJE') ||
    haystack.includes('BASE SENSORES') ||
    haystack.includes('MOUNTING BASE')
  ) {
    return 'base'
  }

  // 3. Estación manual antiexplosiva
  if (
    (haystack.includes('MANUAL') || haystack.includes('ESTACION') || haystack.includes('PULL')) &&
    (haystack.includes('EXPLOSI') || haystack.includes('EX-PROOF') || haystack.includes('PRUEBA DE EXPLOSION'))
  ) {
    return 'explosion_proof_station'
  }

  // 4. Estación manual de jalón / palanca de emergencia
  if (
    haystack.includes('DCP-AMS') ||
    haystack.includes('ESTACION MANUAL') ||
    haystack.includes('MANUAL STATION') ||
    haystack.includes('PULL STATION') ||
    haystack.includes('JALON') ||
    haystack.includes('PALANCA DE EMERGENCIA')
  ) {
    return 'manual_station'
  }

  // 5. Detectores de Gas / Monóxido de Carbono (CO)
  if (
    haystack.includes('CM-E1') ||
    haystack.includes('MONOXIDO') ||
    haystack.includes('CARBONO') ||
    haystack.includes(' CO ') ||
    haystack.includes('GAS') ||
    haystack.includes('METANO') ||
    haystack.includes('PROPANO')
  ) {
    return 'gas_co_detector'
  }

  // 6. Detectores combinados / multicriterio (Humo + Calor)
  if (
    haystack.includes('COMBINADO') ||
    haystack.includes('MULTICRITERIO') ||
    haystack.includes('MULTI-CRITERIA') ||
    haystack.includes('HUMO Y CALOR') ||
    haystack.includes('HUMO-CALOR') ||
    haystack.includes('DUAL SENSOR')
  ) {
    return 'smoke_heat_detector'
  }

  // 7. Detectores térmicos / calor / temperatura
  if (
    haystack.includes('ATJ-') ||
    haystack.includes('DETECTOR TERMICO') ||
    haystack.includes('TEMPERATURA') ||
    haystack.includes('HEAT DETECTOR') ||
    haystack.includes('INCREMENTO') ||
    haystack.includes('RATE-OF-RISE') ||
    haystack.includes('CALOR')
  ) {
    return 'heat_detector'
  }

  // 8. Detectores de humo (fotoeléctricos / ópticos / haz)
  if (
    haystack.includes('ALO-') ||
    haystack.includes('FOTOELECTRICO') ||
    haystack.includes('DETECTOR DE HUMO') ||
    haystack.includes('SMOKE DETECTOR') ||
    haystack.includes('OPTICO DE HUMO') ||
    haystack.includes('HUMO')
  ) {
    return 'smoke_detector'
  }

  // 9. Corneta con estrobo / Notificador A/V
  if (
    haystack.includes('HCC24') ||
    haystack.includes('HEC3-') ||
    haystack.includes('CORNETA CON ESTROBO') ||
    haystack.includes('SIRENA CON ESTROBO') ||
    haystack.includes('HORN STROBE') ||
    haystack.includes('NOTIFICADOR A/V') ||
    haystack.includes('CORNETA CON LUZ') ||
    (haystack.includes('CORNETA') && haystack.includes('ESTROBO'))
  ) {
    return 'horn_strobe'
  }

  // 10. Estrobo de luz estroboscópica sola / beacon
  if (
    haystack.includes('HCS24') ||
    haystack.includes('ESTROBO DE LUZ') ||
    haystack.includes('LUZ ESTROBOSCOPICA') ||
    haystack.includes('STROBE LIGHT') ||
    haystack.includes('ESTROBO TECHO') ||
    haystack.includes('ESTROBO PARED') ||
    haystack.includes('ESTROBO')
  ) {
    return 'strobe_light'
  }

  // 11. Indicador LED remoto / Luz piloto
  if (
    haystack.includes('INDICADOR LED') ||
    haystack.includes('LUZ PILOTO') ||
    haystack.includes('REMOTE LED') ||
    haystack.includes('LED INDICATOR')
  ) {
    return 'led_indicator'
  }

  // 12. Módulos de control / monitoreo / aislador / relevador
  if (
    haystack.includes('SOM-') ||
    haystack.includes('DIMM') ||
    haystack.includes('FCRMA-') ||
    haystack.includes('R2MH') ||
    haystack.includes('MODULO DE') ||
    haystack.includes('MODULO MONITOREO') ||
    haystack.includes('MODULO RELEVADOR') ||
    haystack.includes('MODULO SALIDA') ||
    haystack.includes('MODULO AISLADOR') ||
    haystack.includes('MODULE')
  ) {
    return 'module'
  }

  // 13. Tableros / Paneles de control / Anunciadores remotos
  if (
    haystack.includes('LA102') ||
    haystack.includes('LFC00') ||
    haystack.includes('TABLERO') ||
    haystack.includes('PANEL') ||
    haystack.includes('ANUNCIADOR') ||
    haystack.includes('CENTRAL DE INCENDIO') ||
    haystack.includes('FIRE ALARM PANEL') ||
    haystack.includes('ANNUNCIATOR')
  ) {
    return 'panel'
  }

  return 'panel'
}
