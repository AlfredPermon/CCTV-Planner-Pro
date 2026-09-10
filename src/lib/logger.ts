/**
 * Logger estructurado para CCTV Planner Pro
 * 
 * Basado en pino para alto rendimiento y logs JSON estructurados.
 * Proporciona contexto enriquecido para debugging y monitoreo.
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger'
 * 
 * // Log básico
 * logger.info('Usuario iniciado', { userId: '123' })
 * 
 * // Log con contexto
 * logger.child({ module: 'auth' }).info('Login exitoso')
 * 
 * // Log de error
 * logger.error({ err }, 'Error al guardar usuario')
 * 
 * // Log con métricas
 * logger.debug({ duration: 45, query: 'SELECT...' }, 'Query ejecutado')
 * ```
 */

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

interface LogContext {
  /** ID único del request para correlación */
  requestId?: string
  /** ID del usuario autenticado */
  userId?: string
  /** Módulo o componente emisor */
  module?: string
  /** Acción específica */
  action?: string
  /** Dirección IP del cliente */
  ipAddress?: string
  /** User agent del cliente */
  userAgent?: string
  /** Duración en milisegundos */
  duration?: number
  /** Datos adicionales específicos */
  [key: string]: unknown
}

interface LogData extends LogContext {
  /** Mensaje del log */
  msg: string
  /** Timestamp ISO 8601 */
  time?: string
  /** Nivel de severidad */
  level?: LogLevel
  /** Stack trace para errores */
  stack?: string
  /** Error object */
  err?: {
    type: string
    message: string
    stack: string
  }
}

class Logger {
  private baseContext: LogContext = {}
  private minLevel: number

  constructor(context?: LogContext) {
    this.baseContext = context || {}
    this.minLevel = this.getLogLevel()
  }

  private getLogLevel(): number {
    const levels: Record<LogLevel, number> = {
      fatal: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5,
    }
    
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel
    return levels[envLevel] ?? 3
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      fatal: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5,
    }
    
    return levels[level] <= this.minLevel
  }

  private formatLog(level: LogLevel, message: string, data?: LogContext & { err?: Error }): void {
    if (!this.shouldLog(level)) return

    const logData: LogData = {
      msg: message,
      time: new Date().toISOString(),
      level,
      ...this.baseContext,
      ...data,
    }

    // Añadir información de error si existe
    if (data?.err) {
      logData.err = {
        type: data.err.name || 'Error',
        message: data.err.message,
        stack: data.err.stack || '',
      }
      logData.stack = data.err.stack
    }

    // En desarrollo: formato legible en consola
    if (process.env.NODE_ENV === 'development') {
      this.logPretty(level, logData)
    } else {
      // En producción: JSON para agregadores
      console.log(JSON.stringify(logData))
    }
  }

  private logPretty(level: LogLevel, data: LogData): void {
    const colors = {
      fatal: '\x1b[31m\x1b[1m', // Red Bold
      error: '\x1b[31m',        // Red
      warn: '\x1b[33m',         // Yellow
      info: '\x1b[36m',         // Cyan
      debug: '\x1b[35m',        // Magenta
      trace: '\x1b[90m',        // Gray
    }
    
    const reset = '\x1b[0m'
    const color = colors[level]
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    
    let message = `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${data.msg}`
    
    // Añadir contexto
    const contextParts = []
    if (data.module) contextParts.push(`module:${data.module}`)
    if (data.action) contextParts.push(`action:${data.action}`)
    if (data.userId) contextParts.push(`userId:${data.userId}`)
    if (data.requestId) contextParts.push(`req:${data.requestId}`)
    if (data.duration !== undefined) contextParts.push(`${data.duration}ms`)
    
    if (contextParts.length > 0) {
      message += ` ${colors.info}(${contextParts.join(', ')})${reset}`
    }

    if (data.err) {
      console.error(message)
      console.error(`${colors.gray}${data.err.stack}${reset}`)
    } else {
      console.log(message)
    }
  }

  fatal(message: string, data?: LogContext): void {
    this.formatLog('fatal', message, data)
  }

  error(message: string, data?: LogContext & { err?: Error }): void {
    this.formatLog('error', message, data)
  }

  warn(message: string, data?: LogContext): void {
    this.formatLog('warn', message, data)
  }

  info(message: string, data?: LogContext): void {
    this.formatLog('info', message, data)
  }

  debug(message: string, data?: LogContext): void {
    this.formatLog('debug', message, data)
  }

  trace(message: string, data?: LogContext): void {
    this.formatLog('trace', message, data)
  }

  /**
   * Crea un logger hijo con contexto adicional
   */
  child(context: LogContext): Logger {
    return new Logger({
      ...this.baseContext,
      ...context,
    })
  }

  /**
   * Envuelve una función asíncrona con logging automático
   */
  async wrap<T>(
    fn: () => Promise<T>,
    options: {
      action: string
      successMessage?: string
      errorMessage?: string
      includeResult?: boolean
    }
  ): Promise<T> {
    const { action, successMessage, errorMessage, includeResult } = options
    const start = Date.now()
    
    this.debug(`Iniciando ${action}`)
    
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      this.info(
        successMessage || `${action} completado`,
        { action, duration, ...(includeResult ? { result } : {}) }
      )
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      const err = error instanceof Error ? error : new Error(String(error))
      
      this.error(
        errorMessage || `Error en ${action}`,
        { action, duration, err }
      )
      
      throw error
    }
  }
}

// Logger base con contexto global
export const logger = new Logger({
  module: 'app',
  environment: process.env.NODE_ENV || 'development',
})

// Exportar tipos
export type { Logger, LogContext, LogLevel }
