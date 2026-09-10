import { Metadata } from "next";
import { MultiSystemReportDashboard } from "@/components/reports/MultiSystemReportDashboard";

export const metadata: Metadata = {
  title: "Dashboard de Reportes | CCTV Planner Pro",
  description: "Resumen técnico de infraestructuras y dispositivos por sistema.",
};

export default function ReportsPage() {
  return (
    <div className="w-full min-h-screen">
      <MultiSystemReportDashboard />
    </div>
  );
}
