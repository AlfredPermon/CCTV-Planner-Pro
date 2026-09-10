"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Filter,
  FileCheck2,
  HelpCircle,
} from "lucide-react";
import { ReconciliationReport, DiscrepancyItem, SYSTEM_METADATA } from "@/lib/reports/multiSystemReport";

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reconciliation: ReconciliationReport | null;
  projectName: string;
}

export function ReconciliationModal({
  isOpen,
  onClose,
  reconciliation,
  projectName,
}: ReconciliationModalProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  if (!reconciliation) return null;

  const filteredDiscrepancies = reconciliation.discrepancies.filter((disc) => {
    if (filterSeverity === "all") return true;
    return disc.severity === filterSeverity;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-on-surface">
                  Reporte de Conciliación e Integridad Técnica
                </DialogTitle>
                <DialogDescription className="text-sm text-on-surface-variant">
                  {projectName} • Auditoría de sembrado en plano vs catálogo maestro
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`text-xs px-3 py-1 font-bold ${
                  reconciliation.status === "valid"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : reconciliation.status === "warning"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {reconciliation.statusText}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Score & Automated Checks Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b">
          <div className="p-4 rounded-xl bg-surface border border-outline/20 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Índice de Integridad
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-primary font-mono">{reconciliation.integrityScore}%</span>
              <span className="text-xs text-muted-foreground">de cumplimiento</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${reconciliation.integrityScore}%` }}
              />
            </div>
          </div>

          <div className="md:col-span-2 p-4 rounded-xl bg-surface border border-outline/20 flex flex-col justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Validaciones de Sistema Ejecuatadas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {reconciliation.validations.map((v, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-background border border-outline/10">
                  {v.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="font-medium text-on-surface truncate">{v.checkName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discrepancies Audit Log */}
        <div className="flex justify-between items-center py-3 border-b">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />
            Registro de Observaciones & Discrepancias ({reconciliation.discrepancies.length})
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
            >
              <option value="all">Todas las Severidades</option>
              <option value="high">Alta / Crítica</option>
              <option value="medium">Media</option>
              <option value="low">Baja / Catálogo</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3">
          {filteredDiscrepancies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="font-semibold text-on-surface text-base">¡No se encontraron discrepancias!</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Toda la información del proyecto y sembrado de dispositivos está validada y libre de inconsistencias.
              </p>
            </div>
          ) : (
            filteredDiscrepancies.map((disc) => {
              const sysMeta = SYSTEM_METADATA[disc.systemKey];
              return (
                <div
                  key={disc.id}
                  className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    disc.severity === "high"
                      ? "bg-rose-50/50 border-rose-200 text-rose-900"
                      : disc.severity === "medium"
                      ? "bg-amber-50/50 border-amber-200 text-amber-900"
                      : "bg-sky-50/50 border-sky-200 text-sky-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {disc.severity === "high" ? (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      ) : disc.severity === "medium" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <HelpCircle className="h-4 w-4 text-sky-600" />
                      )}
                      <span className="font-bold text-sm">{disc.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/80 border">
                        {sysMeta?.shortLabel || disc.systemName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          disc.severity === "high"
                            ? "border-rose-400 bg-rose-100 text-rose-800"
                            : disc.severity === "medium"
                            ? "border-amber-400 bg-amber-100 text-amber-800"
                            : "border-sky-400 bg-sky-100 text-sky-800"
                        }`}
                      >
                        {disc.severity}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant">{disc.description}</p>

                  <div className="mt-1 pt-2 border-t border-black/5 text-xs font-medium flex items-start gap-1.5">
                    <span className="font-bold text-on-surface">Recomendación:</span>
                    <span className="text-on-surface-variant">{disc.recommendation}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar Conciliación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
