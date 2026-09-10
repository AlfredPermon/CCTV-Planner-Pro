export type Intent =
  | 'definicion'
  | 'caracteristicas'
  | 'comparacion'
  | 'aplicacion'
  | 'dimensionamiento'
  | 'proyecto'
  | 'otro'

export function classifyIntent(message: string): Intent {
  const q = (message || '').toLowerCase()
  const isDef = /\b(qué es|que es|definici[oó]n)\b/.test(q)
  const isFeat =
    /\b(caracter[ií]sticas|features|especificaciones|atributos)\b/.test(q) ||
    /\b(c[oó]mo es|c[oó]mo luce|tipo)\b/.test(q)
  const isComp = /\b(vs|comparaci[oó]n|diferencias|mejor que)\b/.test(q)
  const isUse = /\b(aplicaci[oó]n|uso|casos de uso|d[oó]nde usar)\b/.test(q)
  const isSizing =
    /\b(dimensionamiento|c[aá]lculo|c[aá]lculos|ancho de banda|bandwidth|almacenamiento|storage|cobertura|fov|mpbs|gb|fps)\b/.test(
      q,
    )
  const isProject =
    /\b(proyecto|plano|planta|pdf|arquitect[oó]nica|edificio|sitio|obra)\b/.test(
      q,
    )
  if (isSizing) return 'dimensionamiento'
  if (isProject) return 'proyecto'
  if (isDef) return 'definicion'
  if (isFeat) return 'caracteristicas'
  if (isComp) return 'comparacion'
  if (isUse) return 'aplicacion'
  return 'otro'
}

export function hasDeviceTerm(message: string, term: string): boolean {
  const q = (message || '').toLowerCase()
  const t = term.toLowerCase()
  return q.includes(t)
}
