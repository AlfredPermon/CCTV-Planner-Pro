'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Monitor, Lock, Hand, AlertCircle } from 'lucide-react'

export type AccessDeviceType = 'terminal' | 'lock' | 'exit_button' | 'emergency_button'

interface AccessControlCatalogProps {
  onAddDevice: (type: AccessDeviceType, modelId: string) => void
  disabled?: boolean
}

const ACCESS_DEVICES = [
  {
    id: 'speedface-v5lp',
    name: 'ZKTECO SpeedFaceV5LP',
    type: 'terminal' as const,
    image: 'https://via.placeholder.com/120x90?text=SpeedFaceV5LP',
    specs: [
      'Reconocimiento facial Visible Light',
      'Capacidad: 10,000 rostros / 20,000 tarjetas',
      'Detección de vida / anti-spoofing',
      'Comunicación: TCP/IP, WiFi, RS-485, Wiegand',
      'Interfaces: Relé de puerta, sensor puerta, timbre'
    ],
    priceUSD: 520,
    availability: 'Stock inmediato'
  },
  {
    id: 'g4l',
    name: 'ZKTECO G4L - Control de Acceso y Asistencia Visible Light (1000 Rostros)',
    type: 'terminal' as const,
    image: 'https://via.placeholder.com/120x90?text=G4L',
    specs: [
      'Reconocimiento facial Visible Light',
      'Capacidad: 1,000 rostros / 10,000 usuarios',
      'Pantalla táctil 4.3"',
      'Comunicación: TCP/IP, WiFi',
      'Interfaces: Wiegand, relé de cerradura'
    ],
    priceUSD: 350,
    availability: 'Bajo pedido (3-5 días)'
  },
  {
    id: 'senseface-7a',
    name: 'ZKTECO SenseFace 7A - Control de acceso y asistencia (10,000 rostros)',
    type: 'terminal' as const,
    image: 'https://via.placeholder.com/120x90?text=SenseFace7A',
    specs: [
      'Reconocimiento facial con IA',
      'Capacidad: 10,000 rostros / 100,000 registros',
      'Cámara dual, anti-spoofing',
      'Comunicación: TCP/IP, WiFi, 4G (opcional)',
      'Interfaces: RS-485, Wiegand, relé'
    ],
    priceUSD: 740,
    availability: 'Stock limitado'
  },
  {
    id: 'maglock-600lb-buzzer',
    name: 'Chapa magnética 600Lb con Buzzer y LED',
    type: 'lock' as const,
    image: 'https://via.placeholder.com/120x90?text=MagLock+600Lb',
    specs: [
      'Fuerza de sujeción: 600Lb (272kg)',
      'Voltaje: 12/24V DC seleccionable',
      'Consumo: 500mA @12V',
      'Indicador LED de estado / Buzzer de puerta abierta',
      'Montaje superficial, incluye herrajes estándar'
    ],
    priceUSD: 85,
    availability: 'Stock inmediato'
  },
  {
    id: 'zk-teco-tleb102',
    name: 'ZKTECO TLEB102 - Botón de Salida sin Contacto',
    type: 'exit_button' as const,
    image: 'https://via.placeholder.com/120x90?text=TLEB102',
    specs: [
      'Tecnología infrarroja (no contacto)',
      'Salida: NO/NC/COM',
      'Voltaje: 12V DC',
      'Distancia de detección: 10cm',
      'Carcasa en aluminio'
    ],
    priceUSD: 22,
    availability: 'Stock inmediato'
  },
  {
    id: 'sti-emergency-blue-es',
    name: 'STI Botón de Salida de Emergencia, Alámbrico, Azul, Español',
    type: 'emergency_button' as const,
    image: 'https://via.placeholder.com/120x90?text=STI+Emergencia',
    specs: [
      'Pulsador de emergencia cableado',
      'Leyenda en español, color azul',
      'Salida: NO/NC con tapa protectora',
      'Incluye placa y tornillería',
      'Apto interiores'
    ],
    priceUSD: 38,
    availability: 'Bajo pedido (1-2 días)'
  }
] satisfies Array<{
  id: string
  name: string
  type: AccessDeviceType
  image: string
  specs: string[]
  priceUSD: number
  availability: string
}>

export default function AccessControlCatalog({ onAddDevice, disabled = false }: AccessControlCatalogProps) {
  const AccessDeviceCard = ({
    id,
    name,
    type,
    onAdd
  }: {
    id: string
    name: string
    type: AccessDeviceType
    onAdd: () => void
  }) => {
    const TypeIcon =
      type === 'terminal' ? Monitor :
      type === 'lock' ? Lock :
      type === 'exit_button' ? Hand :
      AlertCircle
    return (
      <Card className="rounded-xl shadow-sm hover:shadow-lg transition-shadow">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <TypeIcon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
            </div>
            <div className="flex items-start gap-3 px-1 md:px-2">
              <div className="min-w-0">
                <div className="text-base md:text-lg font-semibold leading-tight wrap-break-word">{name}</div>
                <div className="text-sm md:text-base text-muted-foreground capitalize">{type.replace('_', ' ')}</div>
              </div>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="default"
                  onClick={onAdd}
                  className="px-4"
                  disabled={disabled}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      <ScrollArea className="h-80 md:h-105 lg:h-130 pr-1 md:pr-2">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 md:gap-6">
          {ACCESS_DEVICES.map((d) => (
            <AccessDeviceCard
              key={d.id}
              id={d.id}
              name={d.name}
              type={d.type}
              onAdd={() => onAddDevice(d.type, d.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
