export const ACCESS_GROUP_SIZE = 5
export const ACCESS_GROUPS_PER_PAGE = 2

export type AccessExportGroup<T> = {
  devices: T[]
  accessNumbers: number[]
  title: string
}

export function parseAccessSequence(name: string): number | null {
  const match = name.match(/-\s*(\d+)\s*$/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

export function buildAccessExportGroups<T extends { name: string }>(devices: T[]): Array<AccessExportGroup<T>> {
  const normalized = devices
    .map((device, index) => ({
      device,
      index,
      accessNumber: parseAccessSequence(device.name) ?? index + 1,
    }))
    .sort((a, b) => {
      if (a.accessNumber !== b.accessNumber) return a.accessNumber - b.accessNumber
      return a.index - b.index
    })

  const groups: Array<AccessExportGroup<T>> = []
  for (let i = 0; i < normalized.length; i += ACCESS_GROUP_SIZE) {
    const chunk = normalized.slice(i, i + ACCESS_GROUP_SIZE)
    const accessNumbers = chunk.map(item => item.accessNumber)
    groups.push({
      devices: chunk.map(item => item.device),
      accessNumbers,
      title: `Acceso ${accessNumbers.join(', ')}`,
    })
  }

  return groups
}

export function getAccessDetailPageCount(deviceCount: number): number {
  if (deviceCount <= 0) return 0
  const groupCount = Math.ceil(deviceCount / ACCESS_GROUP_SIZE)
  return Math.ceil(groupCount / ACCESS_GROUPS_PER_PAGE)
}
