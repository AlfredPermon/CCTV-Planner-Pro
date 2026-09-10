/**
 * Estructura estándar para respuestas de API en CCTV Planner Pro
 * 
 * @example
 * // Respuesta exitosa
 * {
 *   success: true,
 *   data: { id: "123", name: "Proyecto Test" },
 *   meta: { timestamp: "2024-01-01T00:00:00Z", requestId: "req_abc123", duration: 45 }
 * }
 * 
 * @example
 * // Respuesta con error
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Datos inválidos",
 *     details: { email: ["Formato inválido"], age: ["Debe ser mayor a 18"] }
 *   },
 *   meta: { timestamp: "2024-01-01T00:00:00Z", requestId: "req_def456" }
 * }
 */

export interface ApiError {
  /** Código de error único para manejo programático */
  code: string
  /** Mensaje descriptivo del error */
  message: string
  /** Detalles específicos del error por campo */
  details?: Record<string, string[]>
}

export interface ApiMeta {
  /** Timestamp ISO 8601 de la respuesta */
  timestamp: string
  /** ID único para correlación de requests */
  requestId: string
  /** Duración de la petición en milisegundos */
  duration?: number
  /** Información de paginación (si aplica) */
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T = unknown> {
  /** Indica si la operación fue exitosa */
  success: boolean
  /** Datos de la respuesta (solo si success=true) */
  data?: T
  /** Información de error (solo si success=false) */
  error?: ApiError
  /** Metadatos de la respuesta */
  meta: ApiMeta
}

/**
 * Crea una respuesta de API estandarizada
 */
export function createApiResponse<T>(
  data: T,
  requestId: string,
  duration?: number,
  pagination?: ApiMeta['pagination']
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      duration,
      pagination,
    },
  }
}

/**
 * Crea una respuesta de error estandarizada
 */
export function createApiError(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, string[]>,
  duration?: number
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      duration,
    },
  }
}

/**
 * Helper para convertir Response a ApiResponse tipado
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const body = await response.json()
  
  if (!response.ok) {
    return {
      success: false,
      error: body.error || {
        code: 'HTTP_ERROR',
        message: `Error ${response.status}: ${response.statusText}`,
      },
      meta: body.meta || {
        timestamp: new Date().toISOString(),
        requestId: response.headers.get('x-request-id') || 'unknown',
      },
    }
  }
  
  return body as ApiResponse<T>
}

/**
 * Genera un ID único para requests
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
