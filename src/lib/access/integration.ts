export type Protocol = 'TCP/IP' | 'WiFi' | 'RS-485' | 'Wiegand' | 'Relay' | 'HTTP SDK'

export interface IntegrationDevice {
  id: string
  modelId: string
  type: 'terminal' | 'lock' | 'exit_button' | 'emergency_button'
}

export interface IntegrationResult {
  topology: string[]
  controllers: string[]
  network: {
    vlans?: string[]
    bandwidthEstimateMbps: number
  }
  power: {
    supplyNotes: string[]
  }
  protocols: Record<string, Protocol[]>
  steps: string[]
  compatibilityWarnings: string[]
}

export function getSupportedProtocols(modelId: string, type: IntegrationDevice['type']): Protocol[] {
  if (type === 'terminal') {
    switch (modelId) {
      case 'speedface-v5lp':
        return ['TCP/IP', 'WiFi', 'RS-485', 'Wiegand', 'Relay', 'HTTP SDK']
      case 'g4l':
        return ['TCP/IP', 'WiFi', 'Wiegand', 'Relay']
      case 'senseface-7a':
        return ['TCP/IP', 'WiFi', 'RS-485', 'Wiegand', 'Relay', 'HTTP SDK']
      default:
        return ['TCP/IP', 'Relay']
    }
  }
  if (type === 'lock') return ['Relay']
  if (type === 'exit_button' || type === 'emergency_button') return ['Relay']
  return ['TCP/IP']
}

export function estimateBandwidth(devices: IntegrationDevice[]): number {
  const terminals = devices.filter(d => d.type === 'terminal').length
  // 0.5 Mbps por terminal para eventos y tráfico de API (sin streaming continuo)
  return Number((terminals * 0.5).toFixed(2))
}

export function planIntegration(devices: IntegrationDevice[]): IntegrationResult {
  const protocols: Record<string, Protocol[]> = {}
  const warnings: string[] = []
  const controllers: string[] = []

  devices.forEach(d => {
    const ps = getSupportedProtocols(d.modelId, d.type)
    protocols[d.id] = ps
    if (d.type === 'terminal') {
      if (ps.includes('Wiegand')) controllers.push('Controladora de Acceso con entradas Wiegand (26/34 bits)')
      if (ps.includes('RS-485')) controllers.push('Bus RS-485 para múltiples terminales (topología en línea)')
    }
    if (d.type === 'lock') {
      warnings.push('Verificar corriente de la chapa 600Lb y compatibilidad del relé (12/24V DC)')
    }
    if (d.type === 'exit_button' || d.type === 'emergency_button') {
      warnings.push('Asegurar cableado NO/NC acorde a la lógica de seguridad (fail-safe / fail-secure)')
    }
  })

  const bandwidth = estimateBandwidth(devices)
  const topology = [
    'Terminales conectados a red LAN (PoE si aplica) hacia servidor',
    'Terminales con salida Wiegand/RS-485 hacia controladora de puertas',
    'Controladora gobierna relé hacia chapa magnética',
    'Botón de salida y emergencia en serie a la línea de control del relé'
  ]

  const steps = [
    'Configurar IP estática en terminales y sincronización NTP',
    'Registrar usuarios/rostros y definir reglas de acceso',
    'Cablear Wiegand/RS-485 desde terminal a controladora',
    'Conectar controladora al relé de la chapa (12/24V DC)',
    'Instalar botón de salida (NO/NC) y botón de emergencia en serie',
    'Probar flujo de acceso, salida y alarma (buzzer/LED)'
  ]

  return {
    topology,
    controllers: Array.from(new Set(controllers)),
    network: { bandwidthEstimateMbps: bandwidth },
    power: { supplyNotes: ['Fuente regulada 12/24V DC para chapa y controladora', 'Considerar PoE para terminales si disponible'] },
    protocols,
    steps,
    compatibilityWarnings: Array.from(new Set(warnings))
  }
}
