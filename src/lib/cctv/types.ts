export interface Camera {
  id: string
  type: 'dome' | 'fisheye' | 'bullet' | 'panoramic' | 'ptz'
  name: string
  modelId?: string
  modelName?: string
  sequence?: number
  x: number
  y: number
  rotation: number
  fov: number
  resolution: string
  bitrate: number
  fps: number
  labelOffsetX?: number
  labelOffsetY?: number
  labelVisible?: boolean
  labelFontSize?: number
  labelFontFamily?: string
  labelFontWeight?: 'normal' | 'bold'
  labelFontStyle?: 'normal' | 'italic'
  labelFontColor?: string
  focalLength?: number
  sensorFormat?: string
  sensorWidth?: number
  horizontalRes?: number
  coverageColors?: {
    identification?: string
    recognition?: string
    observation?: string
    detection?: string
  }
  coverageOpacity?: number
  coverageAnimated?: boolean
  coverageShape?: 'auto' | 'fan' | 'semicircle' | 'circle'
  customRadiusMeters?: number
  distanceToObject?: number
  installationHeight?: number
  objectHeight?: number
  cdvWidth?: number
  viewAngle1?: number
  viewAngle2?: number
  cameraVisionLineStatus?: number
  personGenericChecked?: boolean
  personTieChecked?: boolean
}

export interface FloorPlan {
  id: string
  name: string
  url: string
  width: number
  height: number
  scaleMetersPerPixel?: number
  locked?: boolean
  scalePoints?: { ax: number; ay: number; bx: number; by: number }
}

export interface AccessDevice {
  id: string
  type: 'terminal' | 'lock' | 'exit_button' | 'emergency_button'
  name: string
  modelId?: string
  modelName?: string
  iconKey?: string
  labelVisible?: boolean
  labelFontSize?: number
  labelFontFamily?: string
  labelFontWeight?: 'normal' | 'bold'
  labelFontStyle?: 'normal' | 'italic'
  labelFontColor?: string
  x: number
  y: number
  rotation: number
  labelOffsetX?: number
  labelOffsetY?: number
}

export interface VoceoDevice {
  id: string
  type: 'speaker_ceiling' | 'speaker_wall' | 'horn' | 'gateway' | 'amplifier' | 'microphone' | 'panel' | 'nurse_call' | 'beacon' | 'speaker' | string
  iconKey?: string
  name: string
  modelId?: string
  modelName?: string
  labelVisible?: boolean
  labelFontSize?: number
  labelFontFamily?: string
  labelFontWeight?: 'normal' | 'bold'
  labelFontStyle?: 'normal' | 'italic'
  labelFontColor?: string
  x: number
  y: number
  rotation: number
  labelOffsetX?: number
  labelOffsetY?: number
}

export interface FireDevice {
  id: string
  type: 'panel' | 'smoke_detector' | 'smoke_heat_detector' | 'heat_detector' | 'gas_co_detector' | 'manual_station' | 'explosion_proof_station' | 'horn_strobe' | 'strobe_light' | 'led_indicator' | 'module' | 'power_supply' | 'base' | string
  iconKey?: string
  name: string
  modelId?: string
  modelName?: string
  x: number
  y: number
  rotation: number
  labelOffsetX?: number
  labelOffsetY?: number
  labelVisible?: boolean
  labelFontSize?: number
  labelFontFamily?: string
  labelFontWeight?: 'normal' | 'bold'
  labelFontStyle?: 'normal' | 'italic'
  labelFontColor?: string
}

export interface ParkingDevice {
  id: string
  type: 'barrier_left' | 'barrier_right' | 'barrier' | 'uhf_reader' | 'tag' | 'magnetic_loop' | 'parking_meter' | 'generic'
  name: string
  x: number
  y: number
  rotation: number
  sequence?: number
  labelOffsetX?: number
  labelOffsetY?: number
  labelVisible?: boolean
  labelFontSize?: number
  labelFontFamily?: string
  labelFontWeight?: 'normal' | 'bold'
  labelFontStyle?: 'normal' | 'italic'
  labelFontColor?: string
  paymentMethod?: 'monedas' | 'tarjeta' | 'app' | 'mixto'
  communication?: '4g' | 'wifi' | 'lorawan'
  municipalId?: string
}

export type ObjectCategory = 'vehicles' | 'people' | 'office' | 'greenery'
export type ObjectSubtype =
  | 'car_sedan'
  | 'car_suv'
  | 'truck'
  | 'person_man'
  | 'person_woman'
  | 'desk'
  | 'office_chair'
  | 'computer'
  | 'tree'
  | 'plant'

export type AnnotationType = 'text' | 'arrow' | 'circle' | 'square' | 'rectangle' | 'triangle' | 'freehand' | 'image' | 'group' | 'object'

export interface CanvasAnnotation {
  id: string
  type: AnnotationType
  x: number
  y: number
  width?: number
  height?: number
  endX?: number
  endY?: number
  rotation?: number
  points?: { x: number; y: number }[]
  text?: string
  fontSize?: number
  fontFamily?: string
  fontColor?: string
  strokeColor?: string
  strokeWidth?: number
  fillColor?: string
  fillEnabled?: boolean
  imageUrl?: string
  aspectRatio?: number
  children?: CanvasAnnotation[]
  view?: 'cameras' | 'parking' | 'access' | 'voceo' | 'fire' | 'combined' | string
  objectCategory?: ObjectCategory
  objectSubtype?: ObjectSubtype
  realWidthMeters?: number
  realHeightMeters?: number
}

