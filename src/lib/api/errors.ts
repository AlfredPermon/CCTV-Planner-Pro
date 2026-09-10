/**
 * Sistema de errores estandarizado para CCTV Planner Pro
 * 
 * Proporciona una jerarquía de errores tipados para manejo consistente
 * en toda la aplicación.
 */

import type { ApiError } from './response'

/**
 * Error base para todas las excepciones de la aplicación
 */
export class AppError extends Error {
  /** Código único del error para manejo programático */
  public readonly code: string
  /** Status HTTP asociado */
  public readonly status: number
  /** Detalles específicos del error */
  public readonly details?: Record<string, string[]>
  /** Timestamp del error */
  public readonly timestamp: string

  constructor(
    code: string,
    status: number,
    message: string,
    details?: Record<string, string[]>,
    cause?: unknown
  ) {
    super(message, cause ? { cause } : undefined)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
    this.timestamp = new Date().toISOString()
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * Convierte el error a formato de respuesta API
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * Error de validación de datos (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Datos inválidos',
    details?: Record<string, string[]>
  ) {
    super('VALIDATION_ERROR', 400, message, details)
    this.name = 'ValidationError'
  }
}

/**
 * Error de recurso no encontrado (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} con ID '${id}' no encontrado`
      : `${resource} no encontrado`
    super('NOT_FOUND', 404, message)
    this.name = 'NotFoundError'
  }
}

/**
 * Error de autorización (401 Unauthorized)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super('UNAUTHORIZED', 401, message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Error de permisos insuficientes (403 Forbidden)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super('FORBIDDEN', 403, message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Error de conflicto (409 Conflict)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super('CONFLICT', 409, message, details)
    this.name = 'ConflictError'
  }
}

/**
 * Error de servidor interno (500 Internal Server Error)
 */
export class InternalError extends AppError {
  constructor(
    message: string = 'Error interno del servidor',
    cause?: unknown
  ) {
    super('INTERNAL_ERROR', 500, message, undefined, cause)
    this.name = 'InternalError'
  }
}

/**
 * Error de servicio no disponible (503 Service Unavailable)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super('SERVICE_UNAVAILABLE', 503, `Servicio ${service} no disponible`)
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Error de rate limit (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Demasiadas solicitudes. Intente nuevamente en ${retryAfter} segundos`
      : 'Demasiadas solicitudes'
    super('RATE_LIMIT_EXCEEDED', 429, message, { retryAfter: [String(retryAfter)] })
    this.name = 'RateLimitError'
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Error de base de datos',
    cause?: unknown
  ) {
    super('DATABASE_ERROR', 500, message, undefined, cause)
    this.name = 'DatabaseError'
  }
}

/**
 * Error de archivo/imagen
 */
export class FileError extends AppError {
  constructor(
    message: string,
    details?: Record<string, string[]>
  ) {
    super('FILE_ERROR', 400, message, details)
    this.name = 'FileError'
  }
}

/**
 * Mapeo de códigos de error Zod a nuestro formato
 */
export function fromZodError(zodError: unknown): ValidationError {
  if (!(zodError instanceof Error) || !('name' in zodError) || zodError.name !== 'ZodError') {
    return new ValidationError('Error de validación desconocido')
  }

   
  const error = zodError as any
  const details: Record<string, string[]> = {}

  if (Array.isArray(error.errors)) {
    for (const err of error.errors) {
      const path = err.path?.join('.') || 'root'
      if (!details[path]) {
        details[path] = []
      }
      details[path].push(err.message)
    }
  }

  return new ValidationError('Validación fallida', details)
}

/**
 * Handler global de errores para API Routes
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    // Errores conocidos de Next.js
    if (error.name === 'NotFound') {
      return new NotFoundError('Recurso')
    }

    // Errores de Prisma
    if (error.name.includes('Prisma')) {
      return new DatabaseError(`Error de Prisma: ${error.message}`, error)
    }

    // Log error para debugging
    console.error('[ErrorHandler]', error)
    
    return new InternalError(error.message, error)
  }

  // Error desconocido
  console.error('[ErrorHandler] Unknown error:', error)
  return new InternalError('Error inesperado')
}

/**
 * Tipos de errores exportados para conveniencia
 */
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'FILE_ERROR'
