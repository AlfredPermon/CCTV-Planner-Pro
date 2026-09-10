import { describe, expect, it } from 'vitest'

import {
  ACCESS_GROUPS_PER_PAGE,
  ACCESS_GROUP_SIZE,
  buildAccessExportGroups,
  getAccessDetailPageCount,
  parseAccessSequence,
} from '@/lib/pdf/accessExportGrouping'

describe('accessExportGrouping', () => {
  it('extrae la secuencia desde el sufijo numerico del nombre', () => {
    expect(parseAccessSequence('SenseFace 7A - 1')).toBe(1)
    expect(parseAccessSequence('SS2422EX-ES - 4')).toBe(4)
    expect(parseAccessSequence('Equipo sin correlativo')).toBeNull()
  })

  it('agrupa los dispositivos del kit en bloques de cinco accesos ordenados', () => {
    const groups = buildAccessExportGroups([
      { id: 'd4', name: 'SS2422EX-ES - 4' },
      { id: 'd2', name: 'MAG600BZ - 2' },
      { id: 'd1', name: 'SenseFace 7A - 1' },
      { id: 'd3', name: 'K11 - 3' },
      { id: 'd5', name: 'BZL600N - 5' },
      { id: 'd10', name: 'SS2422EX-ES - 10' },
      { id: 'd9', name: 'SenseFace 7A - 9' },
      { id: 'd7', name: 'K11 - 7' },
      { id: 'd6', name: 'MAG600BZ - 6' },
      { id: 'd8', name: 'SS2422EX-ES - 8' },
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].title).toBe('Acceso 1, 2, 3, 4, 5')
    expect(groups[0].devices.map(device => device.name)).toEqual([
      'SenseFace 7A - 1',
      'MAG600BZ - 2',
      'K11 - 3',
      'SS2422EX-ES - 4',
      'BZL600N - 5',
    ])
    expect(groups[1].title).toBe('Acceso 6, 7, 8, 9, 10')
  })

  it('calcula las paginas de detalle segun grupos y bloques por pagina', () => {
    expect(ACCESS_GROUP_SIZE).toBe(5)
    expect(ACCESS_GROUPS_PER_PAGE).toBe(2)
    expect(getAccessDetailPageCount(0)).toBe(0)
    expect(getAccessDetailPageCount(4)).toBe(1)
    expect(getAccessDetailPageCount(5)).toBe(1)
    expect(getAccessDetailPageCount(10)).toBe(1)
    expect(getAccessDetailPageCount(11)).toBe(2)
  })
})
