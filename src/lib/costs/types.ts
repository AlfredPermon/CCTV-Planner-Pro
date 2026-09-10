export type Sistema = 'CCTV' | 'ACCESO' | 'VOCEO' | 'INCENDIO'

export type ComponentoBasico = {
  codigo: string
  descripcion: string
  unidad: 'mts' | 'und' | 'pts'
  categoria: string
  sistema: Sistema
}

export type ParametrosTecnicos = {
  distanciaPromedioCableadoMts?: number
  puntosConexionPorDispositivo?: number
  requisitosPotencia?: {
    fuentePorNDispositivos?: number
  }
  factorRedundancia?: number
}

export type ConteoSembrado = {
  dispositivos: number
}

export type ItemCalculado = {
  item: number
  componente: string
  descripcion: string
  unidad_medida: string
  cantidad: number
  costo_unitario: number
  costo_total: number
  sistema: Sistema
}

export type ResultadoSistema = {
  sistema: Sistema
  items: ItemCalculado[]
  subtotal: number
}

export type TotalesProyectoInput = {
  nombreProyecto: string
  usuario: string
  inflacionPct: number
  impuestosPct: number
  utilidadPct: number
}

export type TotalesProyecto = {
  materiales: number
  manoObra: number
  inflacionAplicada: number
  impuestos: number
  utilidad: number
  totalFinal: number
}

export type CostFetcher = (codigoComponente: string) => Promise<number>

