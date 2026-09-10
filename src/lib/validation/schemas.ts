/**
 * Esquemas de validación centralizados con Zod para CCTV Planner Pro
 * 
 * Todos los formularios y APIs deben usar estos esquemas para consistencia.
 */

import { z } from 'zod'

// ============================================================================
// ESQUEMAS BÁSICOS
// ============================================================================

export const emailSchema = z
  .string()
  .min(1, 'Email es requerido')
  .email('Formato de email inválido')
  .max(255, 'Email demasiado largo')

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .max(100, 'Contraseña demasiado larga')

export const phoneSchema = z
  .string()
  .min(7, 'Número de teléfono muy corto')
  .max(20, 'Número de teléfono muy largo')
  .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido')

export const urlSchema = z
  .string()
  .url('URL inválida')
  .max(2048, 'URL demasiado larga')

// ============================================================================
// USUARIOS Y AUTENTICACIÓN
// ============================================================================

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre demasiado largo'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).default('VIEWER'),
})

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña es requerida'),
})

// ============================================================================
// PROYECTOS
// ============================================================================

export const projectSchema = z.object({
  nombre_proyecto: z.string().min(1, 'Nombre del proyecto es requerido').max(200),
  usuario: z.string().min(1, 'Usuario es requerido'),
  total_calculado: z.number().nonnegative('Total debe ser positivo o cero'),
})

export const createProjectSchema = projectSchema.omit({ total_calculado: true })

export const updateProjectSchema = projectSchema.partial()

// ============================================================================
// COMPONENTES Y COTIZACIONES
// ============================================================================

export const sistemaEnum = z.enum(['CCTV', 'ACCESO', 'VOCEO', 'INCENDIO', 'PARKING'])

export const componenteSchema = z.object({
  codigo_componente: z
    .string()
    .min(1, 'Código es requerido')
    .max(50, 'Código demasiado largo')
    .regex(/^[A-Z0-9_]+$/, 'Código debe ser mayúsculas con guiones bajos'),
  descripcion: z.string().min(1, 'Descripción es requerida').max(500),
  unidad_medida: z.string().min(1, 'Unidad es requerida').max(50),
  categoria: z.string().min(1, 'Categoría es requerida').max(100),
  sistema: sistemaEnum,
})

export const cotizacionSchema = z.object({
  codigo_componente: z.string().min(1, 'Código es requerido'),
  costo_unitario: z.number().positive('Costo debe ser positivo'),
  proveedor: z.string().min(1, 'Proveedor es requerido').max(200),
  vigente: z.boolean().default(true),
  fecha_actualizacion: z.date().optional(),
})

export const bulkCotizacionSchema = z.array(cotizacionSchema).min(1, 'Al menos una cotización requerida')

// ============================================================================
// CÁLCULOS DE COSTOS
// ============================================================================

export const conteoSembradoSchema = z.object({
  dispositivos: z.number().int().nonnegative('Dispositivos debe ser >= 0'),
  cableado: z.number().nonnegative().optional(),
  otros: z.record(z.number()).optional(),
})

export const requisitosPotenciaSchema = z.object({
  voltaje: z.number().positive().optional(),
  amperaje: z.number().positive().optional(),
  fuentePorNDispositivos: z.number().int().positive().optional(),
})

export const parametrosTecnicosSchema = z.object({
  distanciaPromedioCableadoMts: z.number().positive().default(60),
  factorRedundancia: z.number().positive().default(1),
  requisitosPotencia: requisitosPotenciaSchema.optional(),
  otrosParametros: z.record(z.unknown()).optional(),
})

export const calculateCostsInputSchema = z.object({
  cctv: z.object({
    conteo: conteoSembradoSchema,
    params: parametrosTecnicosSchema,
  }).optional(),
  acceso: z.object({
    conteo: conteoSembradoSchema,
    params: parametrosTecnicosSchema,
  }).optional(),
  voceo: z.object({
    conteo: conteoSembradoSchema,
    params: parametrosTecnicosSchema,
  }).optional(),
  incendio: z.object({
    conteo: conteoSembradoSchema,
    params: parametrosTecnicosSchema,
  }).optional(),
})

export const totalesProyectoInputSchema = z.object({
  inflacionPct: z.number().min(0).max(100).default(0),
  impuestosPct: z.number().min(0).max(100).default(0),
  utilidadPct: z.number().min(0).max(100).default(0),
})

// ============================================================================
// DISPOSITIVOS DE CAMPO (CCTV, ACCESO, ETC)
// ============================================================================

export const devicePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const cameraDeviceSchema = z.object({
  id: z.string(),
  type: z.literal('camera'),
  model: z.string(),
  position: devicePositionSchema,
  rotation: z.number().default(0),
  scale: z.number().positive().default(1),
  properties: z.record(z.unknown()).optional(),
})

export const accessDeviceSchema = z.object({
  id: z.string(),
  type: z.literal('access'),
  model: z.string(),
  position: devicePositionSchema,
  rotation: z.number().default(0),
  scale: z.number().positive().default(1),
  properties: z.record(z.unknown()).optional(),
})

export const voceoDeviceSchema = z.object({
  id: z.string(),
  type: z.literal('voceo'),
  model: z.string(),
  position: devicePositionSchema,
  rotation: z.number().default(0),
  scale: z.number().positive().default(1),
  properties: z.record(z.unknown()).optional(),
})

export const incendioDeviceSchema = z.object({
  id: z.string(),
  type: z.literal('incendio'),
  model: z.string(),
  position: devicePositionSchema,
  rotation: z.number().default(0),
  scale: z.number().positive().default(1),
  properties: z.record(z.unknown()).optional(),
})

export const deviceSchema = z.discriminatedUnion('type', [
  cameraDeviceSchema,
  accessDeviceSchema,
  voceoDeviceSchema,
  incendioDeviceSchema,
])

// ============================================================================
// PLANOS Y SEMBRADOS
// ============================================================================

export const floorPlanSchema = z.object({
  id: z.string(),
  imageSrc: z.string().url('URL de imagen inválida'),
  width: z.number().positive(),
  height: z.number().positive(),
  scale: z.number().positive().default(1),
  locked: z.boolean().default(false),
})

export const sembradoCCTVSchema = z.object({
  floorPlan: floorPlanSchema,
  cameras: z.array(cameraDeviceSchema),
  iconScales: z.record(z.number()).optional(),
})

export const sembradoAccesoSchema = z.object({
  floorPlan: floorPlanSchema.optional(),
  floorPlanAccess: floorPlanSchema.optional(),
  accessDevices: z.array(accessDeviceSchema),
  iconScales: z.record(z.number()).optional(),
})

export const sembradoVoceoSchema = z.object({
  floorPlan: floorPlanSchema.optional(),
  floorPlanVoceo: floorPlanSchema.optional(),
  voceoDevices: z.array(voceoDeviceSchema),
  iconScales: z.record(z.number()).optional(),
})

// ============================================================================
// AUDITORÍA
// ============================================================================

export const auditLogSchema = z.object({
  module: z.string().min(1).max(100),
  action: z.string().min(1).max(100),
  user: z.string().min(1),
  status: z.enum(['SUCCESS', 'ERROR', 'WARNING']),
  payload: z.record(z.unknown()).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
})

// ============================================================================
// EXPORTACIÓN DE UTILIDADES
// ============================================================================

/**
 * Helper para validar y parsear datos
 */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data)
}

/**
 * Helper para validación segura (retorna error en lugar de lanzar)
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

// Exportar todos los esquemas
export {
  emailSchema,
  passwordSchema,
  phoneSchema,
  urlSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  projectSchema,
  createProjectSchema,
  updateProjectSchema,
  sistemaEnum,
  componenteSchema,
  cotizacionSchema,
  bulkCotizacionSchema,
  conteoSembradoSchema,
  requisitosPotenciaSchema,
  parametrosTecnicosSchema,
  calculateCostsInputSchema,
  totalesProyectoInputSchema,
  devicePositionSchema,
  cameraDeviceSchema,
  accessDeviceSchema,
  voceoDeviceSchema,
  incendioDeviceSchema,
  deviceSchema,
  floorPlanSchema,
  sembradoCCTVSchema,
  sembradoAccesoSchema,
  sembradoVoceoSchema,
  auditLogSchema,
}
