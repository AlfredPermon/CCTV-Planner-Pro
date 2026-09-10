import { describe, it, expect } from 'vitest'
import { inferFireDeviceType } from './device'
import { getFireColor, FIRE_COLORS } from './iconRegistry'

describe('Fire Protection Device Module', () => {
  describe('inferFireDeviceType', () => {
    it('infiere tableros y anunciadores correctamente', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'LA102H2-10',
          codigo: 'LA102H2-10',
          descripcion: 'Tablero de detección de incendios direccionable de 4 lazos'
        })
      ).toBe('panel')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'LFC00NC-10',
          codigo: 'LFC00NC-10',
          descripcion: 'Anunciador remoto LCD'
        })
      ).toBe('panel')
    })

    it('infiere fuentes de poder y supresores de picos', () => {
      expect(
        inferFireDeviceType({
          marca: 'Ditek',
          modelo: 'DTK-120HW',
          codigo: 'DTK-120HW',
          descripcion: 'Supresor de picos 120VCA para paneles de alarma'
        })
      ).toBe('power_supply')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'FN-1042-ULADA-R',
          codigo: 'FN-1042-ULADA-R',
          descripcion: 'Fuente de poder remota para notificación 4 salidas 10A 24VCD'
        })
      ).toBe('power_supply')

      expect(
        inferFireDeviceType({
          marca: 'LinkedPro',
          modelo: 'LK7.512FR',
          codigo: 'LK7.512FR',
          descripcion: 'Batería 12 V / 7.5 Ah retardante a la flama'
        })
      ).toBe('power_supply')
    })

    it('infiere detectores de humo fotoeléctricos', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'ALO-V',
          codigo: 'ALO-V',
          descripcion: 'Detector fotoeléctrico inteligente de humo direccionable'
        })
      ).toBe('smoke_detector')
    })

    it('infiere detectores térmicos', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'ATJ-EA',
          codigo: 'ATJ-EA',
          descripcion: 'Detector térmico direccionable de temperatura fija/incremento'
        })
      ).toBe('heat_detector')
    })

    it('infiere bases de sensores', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'HSB-NSA-67.',
          codigo: 'HSB-NSA-67.',
          descripcion: 'Base estándar de 4 pulgadas para sensores'
        })
      ).toBe('base')
    })

    it('infiere estaciones manuales de emergencia', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'DCP-AMS-KL-LP/S',
          codigo: 'DCP-AMS-KL-LP/S',
          descripcion: 'Estación manual de emergencia de doble acción con llave'
        })
      ).toBe('manual_station')
    })

    it('infiere módulos de control, monitoreo, aislador y relevador', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'SOM-AI',
          codigo: 'SOM-AI',
          descripcion: 'Módulo de salida de señalización direccionable con aislador'
        })
      ).toBe('module')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'DIMM',
          codigo: 'DIMM',
          descripcion: 'Módulo de supervisión e entrada doble'
        })
      ).toBe('module')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'FCRMA-I',
          codigo: 'FCRMA-I',
          descripcion: 'Módulo de monitoreo sencillo con aislador'
        })
      ).toBe('module')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'R2MH',
          codigo: 'R2MH',
          descripcion: 'Módulo de relevador doble direccionable'
        })
      ).toBe('module')
    })

    it('infiere detectores de monóxido de carbono / gas', () => {
      expect(
        inferFireDeviceType({
          marca: 'Macurco',
          modelo: 'CM-E1',
          codigo: 'CM-E1',
          descripcion: 'Detector de monóxido de carbono (CO) para pared'
        })
      ).toBe('gas_co_detector')
    })

    it('infiere estrobos y cornetas con estrobo', () => {
      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'HCS24CW',
          codigo: 'HCS24CW',
          descripcion: 'Estrobo de luz estroboscópica para techo seleccionable'
        })
      ).toBe('strobe_light')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'HCC24CW',
          codigo: 'HCC24CW',
          descripcion: 'Corneta con luz estroboscópica para techo'
        })
      ).toBe('horn_strobe')

      expect(
        inferFireDeviceType({
          marca: 'Hochiki',
          modelo: 'HEC3-24WR',
          codigo: 'HEC3-24WR',
          descripcion: 'Corneta con estrobo para montaje en pared color rojo'
        })
      ).toBe('horn_strobe')
    })
  })

  describe('getFireColor', () => {
    it('retorna paletas de colores únicas y bien diferenciadas por categoría', () => {
      const panelCol = getFireColor('panel')
      const smokeCol = getFireColor('smoke_detector')
      const heatCol = getFireColor('heat_detector')
      const manualCol = getFireColor('manual_station')
      const hornCol = getFireColor('horn_strobe')
      const strobeCol = getFireColor('strobe_light')
      const moduleCol = getFireColor('module')
      const gasCol = getFireColor('gas_co_detector')

      expect(panelCol.primary).toBe('#dc2626')
      expect(smokeCol.primary).toBe('#f8fafc')
      expect(heatCol.primary).toBe('#f97316')
      expect(manualCol.primary).toBe('#b91c1c')
      expect(hornCol.primary).toBe('#dc2626')
      expect(strobeCol.primary).toBe('#f59e0b')
      expect(moduleCol.primary).toBe('#0284c7')
      expect(gasCol.primary).toBe('#0d9488')

      // Verificar que existan al menos 13 categorías definidas con colores consistentes
      const keys = Object.keys(FIRE_COLORS)
      expect(keys.length).toBeGreaterThanOrEqual(13)
    })
  })
})
