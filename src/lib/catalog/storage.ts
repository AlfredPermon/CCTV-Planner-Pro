import { CatalogModel, CatalogType } from "./types";
import { DEFAULT_CATALOGS } from "./defaultCatalogs";

export const CATALOG_STORAGE_KEYS: Record<CatalogType, string> = {
  cameras: "catalog:cameras",
  access: "catalog:access",
  voceo: "catalog:voceo",
  fire: "catalog:fire",
  parking: "catalog:parking",
};

const memory = new Map<CatalogType, CatalogModel[]>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hasValue(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateRequired(model: CatalogModel): void {
  if (!hasValue(model.id)) throw new Error("El campo id es obligatorio.");
  if (!hasValue(model.marca)) throw new Error("El campo marca es obligatorio.");
  if (!hasValue(model.modelo)) throw new Error("El campo modelo es obligatorio.");
  if (!hasValue(model.codigo)) throw new Error("El campo codigo es obligatorio.");
}

function ensureCodigoUnique(items: CatalogModel[], codigo: string, excludeId?: string): void {
  const exists = items.some((m) => m.codigo === codigo && m.id !== excludeId);
  if (exists) throw new Error("El codigo debe ser único dentro del catálogo.");
}

export function getCatalogItems(type: CatalogType): CatalogModel[] {
  const defaults = DEFAULT_CATALOGS[type] ?? [];

  if (isBrowser()) {
    const key = CATALOG_STORAGE_KEYS[type];
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      if (defaults.length > 0) {
        window.localStorage.setItem(key, JSON.stringify(defaults));
      }
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        if (defaults.length > 0) {
          window.localStorage.setItem(key, JSON.stringify(defaults));
        }
        return defaults;
      }

      if (parsed.length === 0 && defaults.length > 0) {
        window.localStorage.setItem(key, JSON.stringify(defaults));
        return defaults;
      }

      return parsed.filter((m) => typeof m === "object" && m !== null) as CatalogModel[];
    } catch {
      if (defaults.length > 0) {
        window.localStorage.setItem(key, JSON.stringify(defaults));
      }
      return defaults;
    }
  }

  const inMemory = memory.get(type);
  if (inMemory) return inMemory;
  return defaults;
}

export function saveCatalogItems(type: CatalogType, items: CatalogModel[]): void {
  if (isBrowser()) {
    const key = CATALOG_STORAGE_KEYS[type];
    window.localStorage.setItem(key, JSON.stringify(items));
    return;
  }
  memory.set(type, items);
}

export function addModel(type: CatalogType, model: CatalogModel): CatalogModel {
  validateRequired(model);
  const items = getCatalogItems(type);
  ensureCodigoUnique(items, model.codigo);
  const next = [...items, model];
  saveCatalogItems(type, next);
  return model;
}

export function updateModel(
  type: CatalogType,
  id: string,
  patch: Partial<Omit<CatalogModel, "id">>
): CatalogModel {
  const items = getCatalogItems(type);
  const idx = items.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Modelo no encontrado.");
  const updated: CatalogModel = { ...items[idx], ...patch, id };
  validateRequired(updated);
  ensureCodigoUnique(items, updated.codigo, id);
  const next = [...items];
  next[idx] = updated;
  saveCatalogItems(type, next);
  return updated;
}

export function deleteModel(type: CatalogType, id: string): void {
  const items = getCatalogItems(type);
  const next = items.filter((m) => m.id !== id);
  saveCatalogItems(type, next);
}
