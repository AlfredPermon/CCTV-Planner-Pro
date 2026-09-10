import { useCallback, useEffect, useState } from "react"
import { CatalogModel, CatalogType } from "./types"
import {
  addModel,
  deleteModel,
  getCatalogItems,
  updateModel,
  CATALOG_STORAGE_KEYS,
} from "./storage"

export function useCatalog(type: CatalogType) {
  const [items, setItems] = useState<CatalogModel[]>([])

  const reload = useCallback(() => {
    setItems(getCatalogItems(type))
  }, [type])

  useEffect(() => {
    setItems(getCatalogItems(type))
  }, [type])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      const key = CATALOG_STORAGE_KEYS[type]
      if (e.key === key) {
        setItems(getCatalogItems(type))
      }
    }
    window.addEventListener("storage", handler)
    return () => {
      window.removeEventListener("storage", handler)
    }
  }, [type])

  const add = useCallback(
    (model: CatalogModel) => {
      const res = addModel(type, model)
      setItems(getCatalogItems(type))
      return res
    },
    [type]
  )

  const update = useCallback(
    (id: string, patch: Partial<Omit<CatalogModel, "id">>) => {
      const res = updateModel(type, id, patch)
      setItems(getCatalogItems(type))
      return res
    },
    [type]
  )

  const remove = useCallback(
    (id: string) => {
      deleteModel(type, id)
      setItems(getCatalogItems(type))
    },
    [type]
  )

  return { items, add, update, remove, reload }
}
