export type CatalogType = "cameras" | "access" | "voceo" | "fire" | "parking";

export interface CatalogModel {
  id: string;
  marca: string;
  modelo: string;
  codigo: string;
  descripcion?: string;
  notas?: string;
}
