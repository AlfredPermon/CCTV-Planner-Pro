import type { CatalogModel, CatalogType } from './types'
import { CATALOG_STORAGE_KEYS } from './storage'
import * as XLSX from 'xlsx'

export type ImportRow = {
  Marca: string
  Modelo: string
  Codigo: string
  Descripcion?: string
  Notas?: string
}

export type ParsedImport = {
  rows: ImportRow[]
  errors: string[]
  columnsValid: boolean
  missingColumns: string[]
}

export function parseExcel(file: File): Promise<ParsedImport> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
        const required = ['Marca', 'Modelo', 'Código', 'Descripcion', 'Notas']
        const normalized = json.map((r: any) => {
          // Fallback manual más agresivo: limpiar espacios de las keys del Excel
          const getVal = (keys: string[]) => {
            for (const targetKey of keys) {
              // 1. Coincidencia exacta
              if (r[targetKey] !== undefined) return r[targetKey];
              
              // 2. Buscar en todas las keys limpiando espacios y comparando en minúsculas
              const match = Object.keys(r).find(actualKey => 
                actualKey.trim().toLowerCase() === targetKey.trim().toLowerCase()
              );
              if (match && r[match] !== undefined) return r[match];
            }
            return '';
          }
          return {
            Marca: getVal(['Marca', 'marca']),
            Modelo: getVal(['Modelo', 'modelo']),
            Codigo: getVal(['Código', 'Codigo', 'codigo']),
            Descripcion: getVal(['Descripción', 'Descripcion', 'descripcion']),
            Notas: getVal(['Notas', 'notas'])
          }
        })
        const sample = json[0] || {}
        const presentCols = Object.keys(sample).map(k => k.trim().toLowerCase())
        const colsValid = ['marca', 'modelo'].every(k => presentCols.some(c => c.includes(k)))
          && presentCols.some(c => c.includes('código') || c.includes('codigo'))
        const missing: string[] = []
        if (!presentCols.some(c => c.includes('marca'))) missing.push('Marca')
        if (!presentCols.some(c => c.includes('modelo'))) missing.push('Modelo')
        if (!presentCols.some(c => c.includes('código') || c.includes('codigo'))) missing.push('Código')
        resolve({
          rows: normalized,
          errors: [],
          columnsValid: colsValid,
          missingColumns: missing
        })
      } catch (e: any) {
        resolve({
          rows: [],
          errors: [String(e?.message || e)],
          columnsValid: false,
          missingColumns: ['Marca', 'Modelo', 'Código']
        })
      }
    }
    reader.onerror = () => {
      resolve({
        rows: [],
        errors: ['No se pudo leer el archivo'],
        columnsValid: false,
        missingColumns: ['Marca', 'Modelo', 'Código']
      })
    }
    reader.readAsArrayBuffer(file)
  })
}

export function mapRowToModel(row: ImportRow): CatalogModel {
  return {
    id: crypto.randomUUID(),
    marca: String(row.Marca || '').trim(),
    modelo: String(row.Modelo || '').trim(),
    codigo: String(row.Codigo || '').trim(),
    descripcion: String(row.Descripcion || '').trim(),
    notas: String(row.Notas || '').trim()
  }
}

export function getStorageKey(type: CatalogType): string {
  return CATALOG_STORAGE_KEYS[type]
}
