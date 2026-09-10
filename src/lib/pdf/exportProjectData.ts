import type { CanvasAnnotation } from '../cctv/types'
import type { ExportProjectData } from './export'

export type ExportProjectSnapshot = Pick<
  ExportProjectData,
  | 'floorPlan'
  | 'floorPlanAccess'
  | 'floorPlanVoceo'
  | 'floorPlanFire'
  | 'floorPlanParking'
  | 'cameras'
  | 'accessDevices'
  | 'voceoDevices'
  | 'fireDevices'
  | 'parkingDevices'
  | 'iconScales'
  | 'cameraDescriptions'
  | 'hideFovLines'
> & {
  annotations?: CanvasAnnotation[]
}

type StorageLike = Pick<Storage, 'getItem'>

function parseStoredJson<T>(storage: StorageLike, key: string, fallback: T): T {
  const raw = storage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function readStoredExportProjectData(storage: StorageLike): ExportProjectSnapshot {
  const hideStored = storage.getItem('cctv-hide-fov-lines')
  return {
    floorPlan: parseStoredJson(storage, 'cctv-floorPlan', null),
    floorPlanAccess: parseStoredJson(storage, 'cctv-floorPlan-access', null),
    floorPlanVoceo: parseStoredJson(storage, 'cctv-floorPlan-voceo', null),
    floorPlanFire: parseStoredJson(storage, 'cctv-floorPlan-fire', null),
    floorPlanParking: parseStoredJson(storage, 'cctv-floorPlan-parking', null),
    cameras: parseStoredJson(storage, 'cctv-cameras', []),
    accessDevices: parseStoredJson(storage, 'cctv-accessDevices', []),
    voceoDevices: parseStoredJson(storage, 'cctv-voceoDevices', []),
    fireDevices: parseStoredJson(storage, 'cctv-fireDevices', []),
    parkingDevices: parseStoredJson(storage, 'cctv-parkingDevices', []),
    iconScales: parseStoredJson(storage, 'cctv-iconScales', undefined),
    cameraDescriptions: parseStoredJson(storage, 'cctv-cameraDescriptions', undefined),
    hideFovLines: hideStored === '1' || hideStored === 'true',
    annotations: parseStoredJson(storage, 'cctv-annotations', []),
  }
}

export function buildExportProjectData(
  liveSnapshot?: Partial<ExportProjectSnapshot> | null,
  storage?: StorageLike
): ExportProjectSnapshot {
  const stored = storage ? readStoredExportProjectData(storage) : undefined

  return {
    floorPlan: liveSnapshot?.floorPlan ?? stored?.floorPlan ?? null,
    floorPlanAccess: liveSnapshot?.floorPlanAccess ?? stored?.floorPlanAccess ?? null,
    floorPlanVoceo: liveSnapshot?.floorPlanVoceo ?? stored?.floorPlanVoceo ?? null,
    floorPlanFire: liveSnapshot?.floorPlanFire ?? stored?.floorPlanFire ?? null,
    floorPlanParking: liveSnapshot?.floorPlanParking ?? stored?.floorPlanParking ?? null,
    cameras: liveSnapshot?.cameras ?? stored?.cameras ?? [],
    accessDevices: liveSnapshot?.accessDevices ?? stored?.accessDevices ?? [],
    voceoDevices: liveSnapshot?.voceoDevices ?? stored?.voceoDevices ?? [],
    fireDevices: liveSnapshot?.fireDevices ?? stored?.fireDevices ?? [],
    parkingDevices: liveSnapshot?.parkingDevices ?? stored?.parkingDevices ?? [],
    iconScales: liveSnapshot?.iconScales ?? stored?.iconScales,
    cameraDescriptions: liveSnapshot?.cameraDescriptions ?? stored?.cameraDescriptions,
    hideFovLines: liveSnapshot?.hideFovLines ?? stored?.hideFovLines ?? false,
    annotations: liveSnapshot?.annotations ?? stored?.annotations ?? [],
  }
}
