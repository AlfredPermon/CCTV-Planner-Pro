export interface DeviceKnowledge {
  name: string
  definition: string
  features: string[]
  applications: string[]
  notes?: string[]
}

export const CCTV_DOME_CAMERA: DeviceKnowledge = {
  name: 'Cámara tipo domo',
  definition:
    'Cámara de videovigilancia con carcasa esférica/hemisférica que oculta la orientación, diseñada para montaje en techo o pared.',
  features: [
    'Diseño esférico/hemisférico con cúpula transparente u oscurecida',
    'Estética discreta; difícil identificar hacia dónde apunta',
    'Coberturas amplias; PTZ con rotación 360°/inclinación en modelos motorizados',
    'Opciones para exterior con protección IP66/IP67 y antivandálica IK10',
    'Visión nocturna con IR; rangos típicos 20–50 m según modelo',
    'Resoluciones desde 2 MP hasta 4K, con WDR para alto contraste',
    'Lente fija o varifocal (p. ej., 2.8–12 mm) según necesidad',
    'Alimentación PoE; códec H.264/H.265; ONVIF para interoperabilidad',
    'Audio integrado y micrófono en algunos modelos; detección de movimiento/IA',
    'Montaje empotrado/superficial; accesorios de montaje para diferentes superficies',
  ],
  applications: [
    'Vigilancia discreta en interiores: retail, oficinas, pasillos',
    'Zonas de acceso/recepciones donde se busca baja intrusividad',
    'Exteriores cuando se requiere diseño compacto y resistencia',
  ],
  notes: ['Ideal para vigilancia discreta y amplia cobertura desde techo'],
}

export function formatDeviceFeatures(k: DeviceKnowledge): string {
  const lines: string[] = []
  lines.push(`${k.definition}`)
  lines.push('')
  lines.push('Características principales:')
  k.features.forEach((f) => lines.push(`- ${f}`))
  lines.push('')
  lines.push('Aplicaciones típicas:')
  k.applications.forEach((a) => lines.push(`- ${a}`))
  lines.push('')
  lines.push(`Conclusión: ${k.notes?.[0] ?? 'Uso recomendado según entorno y objetivo'}.`)
  return lines.join('\n')
}
