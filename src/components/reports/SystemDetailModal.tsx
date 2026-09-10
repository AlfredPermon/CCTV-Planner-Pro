"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, CheckCircle2, AlertCircle, FileText, Info } from "lucide-react";
import { SystemBreakdown, SYSTEM_METADATA, SystemKey } from "@/lib/reports/multiSystemReport";

interface SystemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: SystemBreakdown | null;
  projectName: string;
}

export function SystemDetailModal({
  isOpen,
  onClose,
  breakdown,
  projectName,
}: SystemDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (!breakdown) return null;

  const meta = breakdown.meta;

  const filteredGroups = breakdown.modelGroups.filter((grp) => {
    const matchesSearch =
      grp.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grp.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grp.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || grp.deviceTypeLabel === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${meta.containerBg} ${meta.textColor}`}>
                <span className="material-symbols-outlined text-2xl">{meta.icon}</span>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-on-surface">
                  Reporte Detallado: {meta.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-on-surface-variant">
                  {projectName} • Total: {breakdown.totalDevices} dispositivos sembrados ({breakdown.percentage}% del total)
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs px-3 py-1 font-mono">
              {breakdown.modelGroups.length} Modelos Distintos
            </Badge>
          </div>
        </DialogHeader>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row gap-3 py-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por modelo, marca o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las Categorías ({breakdown.categoryCounts.length})</option>
              {breakdown.categoryCounts.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Device Table Grid */}
        <div className="flex-1 overflow-y-auto pr-1 py-2">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <Info className="h-8 w-8 mb-2 text-muted-foreground/60" />
              <p>No se encontraron modelos con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group, idx) => (
                <div
                  key={`${group.modelId}_${idx}`}
                  className="rounded-xl border border-outline/20 bg-surface-container-lowest p-4 shadow-sm hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-on-surface text-base">{group.modelName}</h4>
                        <p className="text-xs text-on-surface-variant font-mono">
                          Marca: {group.brand} • Código: {group.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {group.deviceTypeLabel}
                      </Badge>
                      <span className="text-sm font-bold bg-surface-container px-3 py-1 rounded text-primary font-mono">
                        {group.quantity} unidad(es)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                    <strong className="text-on-surface">Ficha Técnica:</strong> {group.description}
                  </p>

                  {group.catalogMatch.matched ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Vinculado con Catálogo Oficial ({group.catalogMatch.code})
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Sembrado como Modelo Genérico Custom
                    </div>
                  )}

                  {/* Sample Placed Locations */}
                  {group.devices.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-outline/20 text-xs text-muted-foreground">
                      <span className="font-medium text-on-surface">Ubicación en Plano:</span>{" "}
                      {group.devices
                        .slice(0, 3)
                        .map((d) => d.name)
                        .join(", ")}
                      {group.devices.length > 3 && ` y ${group.devices.length - 3} más.`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar Detalle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
