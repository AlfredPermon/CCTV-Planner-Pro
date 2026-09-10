import { CostFetcher, ConteoSembrado, ItemCalculado, ParametrosTecnicos, ResultadoSistema, Sistema, TotalesProyecto, TotalesProyectoInput } from './types'

function round2(n: number) {
  return Number(n.toFixed(2))
}

function pushItem(items: ItemCalculado[], partial: Omit<ItemCalculado, 'item' | 'costo_total'>): void {
  const item = {
    ...partial,
    item: items.length + 1,
    costo_total: round2(partial.cantidad * partial.costo_unitario),
  }
  items.push(item)
}

async function calcularCCTV(conteo: ConteoSembrado, params: ParametrosTecnicos, costo: CostFetcher): Promise<ResultadoSistema> {
  const sistema: Sistema = 'CCTV'
  const items: ItemCalculado[] = []
  const n = conteo.dispositivos
  const dist = params.distanciaPromedioCableadoMts ?? 60
  const redund = params.factorRedundancia ?? 1
  const fuentePorN = params.requisitosPotencia?.fuentePorNDispositivos ?? 8

  // Cableado (UTP/Coax)
  const cableUnit = await costo('CCTV_CABLE')
  pushItem(items, {
    componente: 'CCTV_CABLE',
    descripcion: 'Cableado por cámara',
    unidad_medida: 'mts',
    cantidad: round2(n * dist * redund),
    costo_unitario: cableUnit,
    sistema,
  })

  // Conectores
  const conUnit = await costo('CCTV_CONECTOR')
  pushItem(items, {
    componente: 'CCTV_CONECTOR',
    descripcion: 'Conectores por cámara (x2)',
    unidad_medida: 'und',
    cantidad: round2(n * 2 * redund),
    costo_unitario: conUnit,
    sistema,
  })

  // Fuente de poder
  const fuenteUnit = await costo('CCTV_FUENTE')
  const fuentes = Math.ceil((n * redund) / fuentePorN)
  pushItem(items, {
    componente: 'CCTV_FUENTE',
    descripcion: `Fuentes de poder (${fuentePorN} cámaras por fuente)`,
    unidad_medida: 'und',
    cantidad: fuentes,
    costo_unitario: fuenteUnit,
    sistema,
  })

  // Canales de grabación
  const canalUnit = await costo('CCTV_CANAL')
  pushItem(items, {
    componente: 'CCTV_CANAL',
    descripcion: 'Canales de grabación por cámara',
    unidad_medida: 'pts',
    cantidad: n,
    costo_unitario: canalUnit,
    sistema,
  })

  const subtotal = round2(items.reduce((s, i) => s + i.costo_total, 0))
  return { sistema, items, subtotal }
}

async function calcularAcceso(conteo: ConteoSembrado, params: ParametrosTecnicos, costo: CostFetcher): Promise<ResultadoSistema> {
  const sistema: Sistema = 'ACCESO'
  const items: ItemCalculado[] = []
  const n = conteo.dispositivos
  const dist = params.distanciaPromedioCableadoMts ?? 40
  const redund = params.factorRedundancia ?? 1
  const fuentePorN = params.requisitosPotencia?.fuentePorNDispositivos ?? 4

  const cableUnit = await costo('ACC_CABLE')
  pushItem(items, {
    componente: 'ACC_CABLE',
    descripcion: 'Cableado por lector',
    unidad_medida: 'mts',
    cantidad: round2(n * dist * redund),
    costo_unitario: cableUnit,
    sistema,
  })

  const ctrlUnit = await costo('ACC_CONTROLADORA')
  const controladoras = Math.ceil((n * redund) / 2)
  pushItem(items, {
    componente: 'ACC_CONTROLADORA',
    descripcion: 'Controladoras (2 lectores/controladora)',
    unidad_medida: 'und',
    cantidad: controladoras,
    costo_unitario: ctrlUnit,
    sistema,
  })

  const lockUnit = await costo('ACC_CERRADURA')
  pushItem(items, {
    componente: 'ACC_CERRADURA',
    descripcion: 'Cerraduras por puerta',
    unidad_medida: 'und',
    cantidad: n,
    costo_unitario: lockUnit,
    sistema,
  })

  const fuenteUnit = await costo('ACC_FUENTE')
  const fuentes = Math.ceil((n * redund) / fuentePorN)
  pushItem(items, {
    componente: 'ACC_FUENTE',
    descripcion: `Fuentes (${fuentePorN} lectores por fuente)`,
    unidad_medida: 'und',
    cantidad: fuentes,
    costo_unitario: fuenteUnit,
    sistema,
  })

  const subtotal = round2(items.reduce((s, i) => s + i.costo_total, 0))
  return { sistema, items, subtotal }
}

async function calcularVoceo(conteo: ConteoSembrado, params: ParametrosTecnicos, costo: CostFetcher): Promise<ResultadoSistema> {
  const sistema: Sistema = 'VOCEO'
  const items: ItemCalculado[] = []
  const n = conteo.dispositivos
  const dist = params.distanciaPromedioCableadoMts ?? 30
  const redund = params.factorRedundancia ?? 1
  const fuentePorN = params.requisitosPotencia?.fuentePorNDispositivos ?? 6

  const cableUnit = await costo('VOC_CABLE')
  pushItem(items, {
    componente: 'VOC_CABLE',
    descripcion: 'Cableado por panel',
    unidad_medida: 'mts',
    cantidad: round2(n * dist * redund),
    costo_unitario: cableUnit,
    sistema,
  })

  const ampUnit = await costo('VOC_AMPLIFICADOR')
  const amplificadores = Math.ceil((n * redund) / 6)
  pushItem(items, {
    componente: 'VOC_AMPLIFICADOR',
    descripcion: 'Amplificadores (6 paneles por amp)',
    unidad_medida: 'und',
    cantidad: amplificadores,
    costo_unitario: ampUnit,
    sistema,
  })

  const fuenteUnit = await costo('VOC_FUENTE')
  const fuentes = Math.ceil((n * redund) / fuentePorN)
  pushItem(items, {
    componente: 'VOC_FUENTE',
    descripcion: `Fuentes (${fuentePorN} paneles por fuente)`,
    unidad_medida: 'und',
    cantidad: fuentes,
    costo_unitario: fuenteUnit,
    sistema,
  })

  const spkUnit = await costo('VOC_ALTAVOZ')
  pushItem(items, {
    componente: 'VOC_ALTAVOZ',
    descripcion: 'Altavoces por panel',
    unidad_medida: 'und',
    cantidad: n,
    costo_unitario: spkUnit,
    sistema,
  })

  const subtotal = round2(items.reduce((s, i) => s + i.costo_total, 0))
  return { sistema, items, subtotal }
}

async function calcularIncendio(conteo: ConteoSembrado, params: ParametrosTecnicos, costo: CostFetcher): Promise<ResultadoSistema> {
  const sistema: Sistema = 'INCENDIO'
  const items: ItemCalculado[] = []
  const n = conteo.dispositivos
  const dist = params.distanciaPromedioCableadoMts ?? 25
  const redund = params.factorRedundancia ?? 1

  const cableUnit = await costo('FIR_CABLE')
  pushItem(items, {
    componente: 'FIR_CABLE',
    descripcion: 'Cableado por detector',
    unidad_medida: 'mts',
    cantidad: round2(n * dist * redund),
    costo_unitario: cableUnit,
    sistema,
  })

  const panelUnit = await costo('FIR_PANEL')
  const paneles = Math.ceil((n * redund) / 32)
  pushItem(items, {
    componente: 'FIR_PANEL',
    descripcion: 'Panel central (32 detectores/panel)',
    unidad_medida: 'und',
    cantidad: paneles,
    costo_unitario: panelUnit,
    sistema,
  })

  const moduloUnit = await costo('FIR_MODULO')
  pushItem(items, {
    componente: 'FIR_MODULO',
    descripcion: 'Módulos por detector',
    unidad_medida: 'und',
    cantidad: n,
    costo_unitario: moduloUnit,
    sistema,
  })

  const sirenaUnit = await costo('FIR_SIRENA')
  const sirenas = Math.ceil((n * redund) / 4)
  pushItem(items, {
    componente: 'FIR_SIRENA',
    descripcion: 'Sirenas (1 por 4 detectores)',
    unidad_medida: 'und',
    cantidad: sirenas,
    costo_unitario: sirenaUnit,
    sistema,
  })

  const subtotal = round2(items.reduce((s, i) => s + i.costo_total, 0))
  return { sistema, items, subtotal }
}

export async function calcularSubsistemas(
  entrada: {
    cctv?: { conteo: ConteoSembrado; params: ParametrosTecnicos }
    acceso?: { conteo: ConteoSembrado; params: ParametrosTecnicos }
    voceo?: { conteo: ConteoSembrado; params: ParametrosTecnicos }
    incendio?: { conteo: ConteoSembrado; params: ParametrosTecnicos }
  },
  costo: CostFetcher
) {
  const resultados: ResultadoSistema[] = []
  if (entrada.cctv) resultados.push(await calcularCCTV(entrada.cctv.conteo, entrada.cctv.params, costo))
  if (entrada.acceso) resultados.push(await calcularAcceso(entrada.acceso.conteo, entrada.acceso.params, costo))
  if (entrada.voceo) resultados.push(await calcularVoceo(entrada.voceo.conteo, entrada.voceo.params, costo))
  if (entrada.incendio) resultados.push(await calcularIncendio(entrada.incendio.conteo, entrada.incendio.params, costo))
  return resultados
}

export function calcularTotales(resultados: ResultadoSistema[], cfg: TotalesProyectoInput): TotalesProyecto {
  const materiales = round2(resultados.reduce((s, r) => s + r.subtotal, 0))
  const manoObra = round2(materiales * 0.2)
  const inflacionAplicada = round2(materiales * (cfg.inflacionPct / 100))
  const base = materiales + manoObra + inflacionAplicada
  const impuestos = round2(base * (cfg.impuestosPct / 100))
  const utilidad = round2(base * (cfg.utilidadPct / 100))
  const totalFinal = round2(base + impuestos + utilidad)
  return { materiales, manoObra, inflacionAplicada, impuestos, utilidad, totalFinal }
}

export function detectarCostosFaltantes(resultados: ResultadoSistema[]) {
  return resultados.flatMap((r) =>
    r.items
      .filter((i) => i.costo_unitario === 0)
      .map((i) => ({
        sistema: r.sistema,
        componente: i.componente,
        descripcion: i.descripcion,
      }))
  )
}

