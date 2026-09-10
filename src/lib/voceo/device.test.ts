import { describe, it, expect } from 'vitest'
import { inferVoceoDeviceType } from './device'
import { getVoceoColor, VOCEO_COLORS } from './iconRegistry'

describe('Voceo Device Module', () => {
  describe('inferVoceoDeviceType', () => {
    it('infiere altavoces de techo empotrados correctamente', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Fanvil',
          modelo: 'A201',
          codigo: 'A201',
          descripcion: 'Altavoz de techo para voceo IP',
          notas: 'Montaje empotrado'
        })
      ).toBe('speaker_ceiling')

      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'SXC001',
          codigo: 'SXC001',
          descripcion: 'Parlante de techo 10W/15W'
        })
      ).toBe('speaker_ceiling')
    })

    it('infiere gateways e interfaces de voceo correctamente', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Fanvil',
          modelo: 'PA3F',
          codigo: 'PA3F',
          descripcion: 'Gateway para Voceo IP y periféricos'
        })
      ).toBe('gateway')

      expect(
        inferVoceoDeviceType({
          marca: 'Fanvil',
          modelo: 'PA2',
          codigo: 'PA2',
          descripcion: 'SIP Video Intercom & Paging Gateway'
        })
      ).toBe('gateway')

      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'IPAC18',
          codigo: 'IPAC18',
          descripcion: 'Placa PCB para integración de voz e interfonía IP'
        })
      ).toBe('gateway')
    })

    it('infiere cornetas y altavoces exteriores de alta potencia', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'Corneta Exterior 15W',
          codigo: 'Corneta Exterior 15W',
          descripcion: 'Corneta de voceo exterior IP65'
        })
      ).toBe('horn')

      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'SXWE02',
          codigo: 'SXWE02',
          descripcion: 'Bocina de alta potencia exterior 20W'
        })
      ).toBe('horn')
    })

    it('infiere altavoces de pared de sobreponer', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'SXW001',
          codigo: 'SXW001',
          descripcion: 'Parlante de pared 10W/15W de sobreponer'
        })
      ).toBe('speaker_wall')
    })

    it('infiere micrófonos y consolas de escritorio', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Fanvil',
          modelo: 'A32i',
          codigo: 'A32i',
          descripcion: 'Consola de micrófono de escritorio con cuello de ganso'
        })
      ).toBe('microphone')
    })

    it('infiere amplificadores de potencia', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'AMP-120',
          codigo: 'AMP-120',
          descripcion: 'Amplificador de potencia 120W 70V/100V'
        })
      ).toBe('amplifier')
    })

    it('infiere llamado de enfermera e interfonía hospitalaria', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'RCU-IP',
          codigo: 'RCU-IP',
          descripcion: 'Terminal de llamado de enfermera IP'
        })
      ).toBe('nurse_call')
    })

    it('infiere luminarias y señalizadores visuales de voceo', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'DTL-ENF',
          codigo: 'DTL-ENF',
          descripcion: 'Luminaria corrediza para sistema de llamado de enfermería'
        })
      ).toBe('beacon')
    })

    it('infiere paneles de control y servidores IP', () => {
      expect(
        inferVoceoDeviceType({
          marca: 'Genérico',
          modelo: 'IP Paging Server',
          codigo: 'IP Paging Server',
          descripcion: 'Servidor IP para sistemas de voceo'
        })
      ).toBe('panel')
    })
  })

  describe('getVoceoColor', () => {
    it('retorna paletas de colores únicas y diferenciadas por tipo', () => {
      const ceilingColor = getVoceoColor('speaker_ceiling')
      const wallColor = getVoceoColor('speaker_wall')
      const gatewayColor = getVoceoColor('gateway')
      const hornColor = getVoceoColor('horn')
      const micColor = getVoceoColor('microphone')

      expect(ceilingColor.primary).toBe('#f59e0b')
      expect(wallColor.primary).toBe('#ea580c')
      expect(gatewayColor.primary).toBe('#0284c7')
      expect(hornColor.primary).toBe('#e11d48')
      expect(micColor.primary).toBe('#059669')

      // Verificar que los colores primarios son todos distintos para evitar confusiones
      const primaries = new Set([
        VOCEO_COLORS.speaker_ceiling.primary,
        VOCEO_COLORS.speaker_wall.primary,
        VOCEO_COLORS.horn.primary,
        VOCEO_COLORS.gateway.primary,
        VOCEO_COLORS.amplifier.primary,
        VOCEO_COLORS.microphone.primary,
        VOCEO_COLORS.panel.primary,
        VOCEO_COLORS.nurse_call.primary,
        VOCEO_COLORS.beacon.primary,
      ])
      expect(primaries.size).toBe(9)
    })
  })
})
