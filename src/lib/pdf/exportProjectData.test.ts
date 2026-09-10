import { describe, expect, it } from 'vitest'
import { buildExportProjectData, readStoredExportProjectData } from './exportProjectData'

function createStorage(data: Record<string, unknown>) {
  return {
    getItem(key: string) {
      return key in data ? JSON.stringify(data[key]) : null
    },
  }
}

describe('exportProjectData', () => {
  it('prioriza el snapshot vivo para voceo sobre localStorage', () => {
    const storage = createStorage({
      'cctv-voceoDevices': [],
    })

    const result = buildExportProjectData(
      {
        voceoDevices: [
          { id: 'vo-1', type: 'speaker', name: 'Bocina - 1', x: 120, y: 180, rotation: 0 },
        ],
      },
      storage
    )

    expect(result.voceoDevices).toHaveLength(1)
    expect(result.voceoDevices?.[0]?.id).toBe('vo-1')
  })

  it('respeta arrays vacios del snapshot vivo y no reinyecta datos viejos del storage', () => {
    const storage = createStorage({
      'cctv-voceoDevices': [
        { id: 'vo-old', type: 'horn', name: 'Corneta - 1', x: 10, y: 20, rotation: 0 },
      ],
    })

    const result = buildExportProjectData(
      {
        voceoDevices: [],
      },
      storage
    )

    expect(result.voceoDevices).toEqual([])
  })

  it('usa localStorage como respaldo cuando no recibe snapshot', () => {
    const storage = createStorage({
      'cctv-floorPlan-voceo': { url: '/voceo.png', width: 800, height: 600 },
      'cctv-floorPlan-parking': { url: '/parking.png', width: 1024, height: 768 },
      'cctv-voceoDevices': [
        { id: 'vo-2', type: 'panel', name: 'Panel - 1', x: 55, y: 65, rotation: 90 },
      ],
      'cctv-parkingDevices': [
        { id: 'pk-1', type: 'parking_meter', name: 'PK - 1', x: 95, y: 125, rotation: 0 },
      ],
    })

    const result = buildExportProjectData(undefined, storage)

    expect(result.floorPlanVoceo?.url).toBe('/voceo.png')
    expect(result.floorPlanParking?.url).toBe('/parking.png')
    expect(result.voceoDevices?.[0]?.id).toBe('vo-2')
    expect(result.parkingDevices?.[0]?.id).toBe('pk-1')
  })

  it('tolera JSON invalido en localStorage sin romper la exportacion', () => {
    const storage = {
      getItem(key: string) {
        if (key === 'cctv-voceoDevices') return '{invalid-json'
        return null
      },
    }

    const result = readStoredExportProjectData(storage)

    expect(result.voceoDevices).toEqual([])
  })
})
