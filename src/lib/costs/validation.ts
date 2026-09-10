export type Regla = {
  codigo: string
  descripcion: string
  ok: boolean
}

export function validarParametros(input: {
  cctv?: { dispositivos: number; distancia: number }
  acceso?: { dispositivos: number; distancia: number }
  voceo?: { dispositivos: number; distancia: number }
  incendio?: { dispositivos: number; distancia: number }
}): Regla[] {
  const reglas: Regla[] = []
  if (input.cctv) {
    reglas.push({
      codigo: 'CCTV_MAX_CABLE',
      descripcion: 'Máximo de cableado por canal <= 100m',
      ok: input.cctv.distancia <= 100,
    })
  }
  if (input.acceso) {
    reglas.push({
      codigo: 'ACC_CAP_CTRL',
      descripcion: 'Capacidad controladoras: 2 lectores por controladora',
      ok: input.acceso.dispositivos / 2 >= 1,
    })
  }
  if (input.voceo) {
    reglas.push({
      codigo: 'VOC_RANGO',
      descripcion: 'Cobertura altavoz: distancia media <= 50m',
      ok: input.voceo.distancia <= 50,
    })
  }
  if (input.incendio) {
    reglas.push({
      codigo: 'FIR_CAP_PANEL',
      descripcion: 'Capacidad panel: 32 detectores por panel',
      ok: input.incendio.dispositivos / 32 >= 1,
    })
  }
  return reglas
}

export function mapaValidaciones(reglas: Regla[]): Record<string, { valido: boolean; mensaje: string }> {
  const out: Record<string, { valido: boolean; mensaje: string }> = {}
  for (const r of reglas) {
    out[r.codigo] = { valido: r.ok, mensaje: r.descripcion }
  }
  return out
}

