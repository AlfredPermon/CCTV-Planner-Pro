"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Camera, BadgeCheck, Megaphone, Flame, Car, Layout, Calculator, MessageSquare } from "lucide-react"

export type CatalogKey = "cameras" | "access" | "voceo" | "fire" | "parking"
export type WorkspaceTabKey = "design" | "calculations" | "assistant"

const CATALOG_ITEMS: Array<{
  key: CatalogKey
  title: string
  description: string
  ariaLabel: string
  icon: typeof Camera
}> = [
  {
    key: "cameras",
    title: "Catálogo de Cámaras",
    description: "Ver modelos y agregar al plano",
    ariaLabel: "Catálogo de Cámaras",
    icon: Camera,
  },
  {
    key: "access",
    title: "Catálogo de Control de Acceso",
    description: "Terminales, chapas y botones",
    ariaLabel: "Catálogo de Control de Acceso",
    icon: BadgeCheck,
  },
  {
    key: "voceo",
    title: "Catálogo de Voceo",
    description: "Bocinas, cornetas y paneles",
    ariaLabel: "Catálogo de Voceo",
    icon: Megaphone,
  },
  {
    key: "fire",
    title: "Catálogo de Incendio",
    description: "Paneles, detectores y estaciones",
    ariaLabel: "Catálogo de Incendio",
    icon: Flame,
  },
  {
    key: "parking",
    title: "Catálogo de Sistema Parquímetro",
    description: "Parquímetros y periféricos asociados",
    ariaLabel: "Catálogo de Sistema Parquímetro",
    icon: Car,
  },
]

const WORKSPACE_ITEMS: Array<{
  key: WorkspaceTabKey
  title: string
  description: string
  ariaLabel: string
  icon: typeof Layout
}> = [
  {
    key: "design",
    title: "Diseño 2D",
    description: "Plano, siembra y edición de elementos",
    ariaLabel: "Módulo Diseño 2D",
    icon: Layout,
  },
  {
    key: "calculations",
    title: "Cálculos",
    description: "Dimensionamiento y estimaciones",
    ariaLabel: "Módulo Cálculos",
    icon: Calculator,
  },
  {
    key: "assistant",
    title: "Asistente",
    description: "Ayuda contextual y soporte guiado",
    ariaLabel: "Módulo Asistente",
    icon: MessageSquare,
  },
]

export default function CatalogSidebar({
  selected,
  onSelect,
  allowedCatalogs,
  compact = false,
  activeWorkspaceTab,
  onWorkspaceTabChange,
}: {
  selected: CatalogKey | null
  onSelect: (key: CatalogKey | null) => void
  allowedCatalogs?: CatalogKey[]
  compact?: boolean
  activeWorkspaceTab?: WorkspaceTabKey
  onWorkspaceTabChange?: (tab: WorkspaceTabKey) => void
}) {
  const visibleItems = CATALOG_ITEMS.filter((item) => !allowedCatalogs || allowedCatalogs.includes(item.key))

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-sidebar/95 text-sidebar-foreground shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className={compact ? "border-b border-border/60 px-4 py-3" : "border-b border-border/60 px-5 py-4"}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-[0.02em] text-foreground">Catálogos</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {compact ? "Panel minimalista para sembrar sobre el plano." : "Selecciona un módulo para sembrar sobre el plano."}
            </div>
          </div>
        </div>
      </div>
      <div className={compact ? "flex-1 overflow-auto px-2 py-2" : "flex-1 overflow-auto px-3 py-3"}>
        <Accordion
          type="single"
          collapsible
          value={selected ?? undefined}
          onValueChange={(v) => onSelect((v as CatalogKey) ?? null)}
        >
          {visibleItems.map((item, index) => {
            const Icon = item.icon
            const itemClassName = index === visibleItems.length - 1
              ? "overflow-hidden rounded-2xl border border-transparent bg-background/65 px-1 transition-colors data-[state=open]:border-primary/20 data-[state=open]:bg-primary/5"
              : "mb-2 overflow-hidden rounded-2xl border border-transparent bg-background/65 px-1 transition-colors data-[state=open]:border-primary/20 data-[state=open]:bg-primary/5"

            return (
              <AccordionItem key={item.key} value={item.key} className={itemClassName}>
                <AccordionTrigger className="px-3 py-3 hover:no-underline" aria-label={item.ariaLabel}>
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold">{item.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        {onWorkspaceTabChange && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Módulos
            </div>
            <div className="space-y-2">
              {WORKSPACE_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeWorkspaceTab === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={item.ariaLabel}
                    aria-pressed={isActive}
                    onClick={() => onWorkspaceTabChange(item.key)}
                    className={`w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "border-primary/20 bg-primary/5"
                        : "border-transparent bg-background/65 hover:border-primary/15 hover:bg-primary/3"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`rounded-xl p-2 ${isActive ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
