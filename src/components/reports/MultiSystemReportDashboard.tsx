"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  generateMultiSystemSummary,
  MultiSystemSummary,
  SYSTEM_METADATA,
  SystemKey,
} from "@/lib/reports/multiSystemReport";
import { loadActiveProjectDataAsync } from "@/lib/cctv/projectSync";
import { exportMultiSystemPDF, exportMultiSystemExcel } from "@/lib/reports/exportMultiSystem";
import { SystemDetailModal } from "./SystemDetailModal";
import { ReconciliationModal } from "./ReconciliationModal";

export interface MultiSystemReportDashboardProps {
  initialSummary?: MultiSystemSummary;
}

export function MultiSystemReportDashboard({ initialSummary }: MultiSystemReportDashboardProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<MultiSystemSummary | null>(initialSummary || null);

  const [selectedSystemKey, setSelectedSystemKey] = useState<SystemKey | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reconModalOpen, setReconModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Asynchronously scan active project state from localStorage, active-project JSON, or IndexedDB
  const refreshReportData = useCallback(async () => {
    try {
      const activeData = await loadActiveProjectDataAsync();
      const generated = generateMultiSystemSummary({
        projectName: activeData.projectName,
        cameras: activeData.cameras,
        accessDevices: activeData.accessDevices,
        voceoDevices: activeData.voceoDevices,
        fireDevices: activeData.fireDevices,
        parkingDevices: activeData.parkingDevices,
        floorPlan: activeData.floorPlan,
        floorPlanAccess: activeData.floorPlanAccess,
        floorPlanVoceo: activeData.floorPlanVoceo,
        floorPlanFire: activeData.floorPlanFire,
        floorPlanParking: activeData.floorPlanParking,
      });

      setSummary(generated);
      return generated;
    } catch (e) {
      console.error("Error refreshing report summary data", e);
      const fallback = generateMultiSystemSummary({});
      setSummary(fallback);
      return fallback;
    }
  }, []);

  // Initial load and real-time subscription
  useEffect(() => {
    if (!initialSummary) {
      refreshReportData();
    }

    const handleProjectUpdate = () => {
      refreshReportData();
    };

    window.addEventListener("storage", handleProjectUpdate);
    window.addEventListener("cctv-project-updated", handleProjectUpdate);
    window.addEventListener("focus", handleProjectUpdate);

    return () => {
      window.removeEventListener("storage", handleProjectUpdate);
      window.removeEventListener("cctv-project-updated", handleProjectUpdate);
      window.removeEventListener("focus", handleProjectUpdate);
    };
  }, [initialSummary, refreshReportData]);

  const activeSummary = useMemo(() => summary || generateMultiSystemSummary({}), [summary]);

  // Manual Sincronizar handler
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const fresh = await refreshReportData();

      toast({
        title: "Sincronización Completada",
        description: `Se han escaneado y verificado exitosamente ${fresh.totalSeededDevices} dispositivos sembrados en el plano activo.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error de Sincronización",
        description: "No se pudo completar el recálculo manual de dispositivos.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenDetail = (systemKey: SystemKey) => {
    setSelectedSystemKey(systemKey);
    setDetailModalOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      await exportMultiSystemPDF(activeSummary);
      toast({
        title: "PDF Generado con Éxito",
        description: `Se ha descargado el Reporte Múltiples Sistemas en formato PDF.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error de Exportación",
        description: "Ocurrió un problema al generar el archivo PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportMultiSystemExcel(activeSummary);
      toast({
        title: "Excel Generado con Éxito",
        description: `Se ha descargado la hoja de cálculo multi-sistema en formato XLSX.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error de Exportación",
        description: "Ocurrió un problema al generar el archivo Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Circular progress ring dash offset helper
  const getRingOffset = (pct: number) => {
    const radius = 40;
    const perimeter = 2 * Math.PI * radius; // 251.2
    const fillFraction = Math.min(100, Math.max(0, pct)) / 100;
    return perimeter * (1 - fillFraction);
  };

  const selectedBreakdown = selectedSystemKey ? activeSummary.breakdownBySystem[selectedSystemKey] : null;

  // Main system keys to render in Concentrado ring grid
  const concentradoSystems: SystemKey[] = ["cctv", "access", "voceo", "fire"];

  return (
    <div className="w-full bg-[#f8f9ff] text-[#133454] font-sans min-h-screen flex flex-col">
      {/* Sub-Header Navigation Bar matching reference image top header */}
      <header className="w-full bg-[#e5efff] border-b border-[#96b4da]/40 px-6 h-16 flex justify-between items-center sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#0762a4] text-2xl font-bold">security</span>
          <span className="text-xl font-bold text-[#0762a4]">CCTV Planner Pro</span>
        </div>

        <nav className="hidden md:flex h-full items-center gap-1">
          <Link
            href="/"
            className="text-[#436183] text-sm font-medium px-4 h-full flex items-center hover:bg-[#d1e4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-lg mr-2">videocam</span> CCTV
          </Link>
          <Link
            href="/?view=access"
            className="text-[#436183] text-sm font-medium px-4 h-full flex items-center hover:bg-[#d1e4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-lg mr-2">door_front</span> Access
          </Link>
          <Link
            href="/?view=voceo"
            className="text-[#436183] text-sm font-medium px-4 h-full flex items-center hover:bg-[#d1e4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-lg mr-2">settings_input_antenna</span> Paging
          </Link>
          <Link
            href="/?view=fire"
            className="text-[#436183] text-sm font-medium px-4 h-full flex items-center hover:bg-[#d1e4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-lg mr-2">cloud_download</span> Fire
          </Link>
          {/* Active Navigation Tab: Reportes */}
          <Link
            href="/reports"
            className="text-[#0762a4] border-b-2 border-[#0762a4] text-sm font-bold px-4 h-full flex items-center bg-[#dbe9ff]"
          >
            <span className="material-symbols-outlined text-lg mr-2 text-[#0762a4]">analytics</span> Reportes
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-6 md:p-8 flex flex-col gap-8">
        {/* Title Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#96b4da]/30 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#133454] tracking-tight mb-1">Dashboard de Reportes</h1>
            <p className="text-[#436183] text-base">Resumen técnico de infraestructuras y dispositivos</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 border border-[#0762a4] text-[#0762a4] bg-white font-mono text-xs font-bold rounded hover:bg-[#e5efff] transition-colors uppercase cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <span className={`material-symbols-outlined text-base ${isSyncing ? "animate-spin" : ""}`}>
                sync
              </span>
              {isSyncing ? "SINCRONIZANDO..." : "SINCRONIZAR"}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 border border-[#5f7da0] text-[#0762a4] font-mono text-xs font-bold rounded hover:bg-[#e5efff] transition-colors uppercase cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">download</span> EXPORT EXCEL
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-[#0762a4] text-[#f7f9ff] font-mono text-xs font-bold rounded hover:bg-[#005592] transition-colors shadow-xs uppercase cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span> EXPORT PDF
            </button>
          </div>
        </section>

        {/* Top Widgets Grid: Concentrado General (2/3) & Conciliación (1/3) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reporte Concentrado General Card */}
          <div className="lg:col-span-2 bg-white border border-[#5f7da0]/20 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#133454]">Reporte Concentrado General</h2>
              <div className="text-right">
                <span className="block text-[#436183] font-mono text-xs uppercase tracking-wider font-semibold">
                  TOTAL DISPOSITIVOS
                </span>
                <span className="text-4xl text-[#0762a4] font-bold font-mono">
                  {activeSummary.totalDevices.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Circular Progress Rings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {concentradoSystems.map((sysKey) => {
                const meta = SYSTEM_METADATA[sysKey];
                const sysData = activeSummary.breakdownBySystem[sysKey];
                const pct = sysData.percentage;
                const offset = getRingOffset(pct);

                return (
                  <div
                    key={sysKey}
                    onClick={() => handleOpenDetail(sysKey)}
                    className="flex flex-col items-center justify-center p-4 bg-[#f8f9ff] rounded-xl border border-[#5f7da0]/10 hover:border-[#0762a4]/30 transition-all cursor-pointer group"
                  >
                    <div className="relative w-20 h-20 mb-3">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-[#d1e4ff] stroke-current"
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          strokeWidth="8"
                        />
                        <circle
                          className="progress-ring__circle transition-all duration-700 ease-out"
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          stroke={meta.color}
                          strokeWidth="8"
                          strokeDasharray="251.2"
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          className="material-symbols-outlined text-xl transition-transform group-hover:scale-110"
                          style={{ color: meta.color }}
                        >
                          {meta.icon}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[#133454] font-mono">{sysData.totalDevices}</span>
                    <span className="font-mono text-xs font-semibold text-[#436183] uppercase mt-0.5">
                      {meta.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conciliación Section Card */}
          <div className="bg-[#94c4ff] border border-[#0762a4]/20 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#003e6d] text-2xl font-bold">verified</span>
                <h2 className="text-xl font-bold text-[#003e6d]">Conciliación</h2>
              </div>
              <p className="text-sm text-[#003e6d]/85 mb-6 leading-relaxed">
                Valida el estado de la infraestructura instalada vs el diseño planeado en plano CAD.
              </p>

              <div className="bg-white/60 rounded-lg p-3 flex items-center justify-between mb-8 border border-white/50 backdrop-blur-xs">
                <span className="font-mono text-xs font-bold text-[#003e6d]">Estado Actual:</span>
                <span className="inline-flex items-center gap-1.5 bg-[#cef5d6] text-[#00652f] px-3 py-1 rounded font-mono text-xs font-bold uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0d6e36]" />
                  {activeSummary.reconciliation.statusText}
                </span>
              </div>
            </div>

            <button
              onClick={() => setReconModalOpen(true)}
              className="w-full py-3 bg-[#003e6d] text-white font-mono text-xs font-bold rounded-lg hover:bg-[#00294a] transition-colors uppercase tracking-wider flex justify-center items-center gap-2 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">summarize</span>
              GENERAR REPORTE CONCILIACIÓN
            </button>
          </div>
        </section>

        {/* System Breakdown Section */}
        <section>
          <h3 className="text-xl font-bold text-[#133454] mb-4">Desglose por Sistema</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["cctv", "access", "voceo", "fire"] as SystemKey[]).map((sysKey) => {
              const meta = SYSTEM_METADATA[sysKey];
              const sysData = activeSummary.breakdownBySystem[sysKey];

              return (
                <div
                  key={sysKey}
                  className="bg-white border border-[#5f7da0]/20 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#96b4da]/30">
                      <div className={`w-10 h-10 rounded-lg ${meta.containerBg} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-xl" style={{ color: meta.color }}>
                          {meta.icon}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-[#133454]">{meta.title}</h4>
                    </div>

                    {/* Category rows */}
                    <div className="flex flex-col gap-3 mb-6">
                      {sysData.categoryCounts.map((cat, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#f8f9ff] p-3 rounded-lg">
                          <span className="text-sm text-[#436183] font-medium">{cat.category}</span>
                          <span className="font-mono text-xs font-bold text-[#133454] bg-[#e5efff] px-3 py-1 rounded">
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetail(sysKey)}
                    className="w-full py-2.5 border border-[#5f7da0] text-[#0762a4] font-mono text-xs font-bold rounded-lg hover:bg-[#e5efff] transition-colors uppercase cursor-pointer"
                  >
                    VER DETALLE
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* System Detail Modal */}
      <SystemDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        breakdown={selectedBreakdown}
        projectName={activeSummary.projectName}
      />

      {/* Reconciliation Audit Modal */}
      <ReconciliationModal
        isOpen={reconModalOpen}
        onClose={() => setReconModalOpen(false)}
        reconciliation={activeSummary.reconciliation}
        projectName={activeSummary.projectName}
      />
    </div>
  );
}
