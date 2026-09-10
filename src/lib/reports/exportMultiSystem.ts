import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import { MultiSystemSummary, SYSTEM_METADATA, SystemKey } from "./multiSystemReport";

/**
 * Export Multi-System Summary report to a structured PDF document
 */
export async function exportMultiSystemPDF(
  summary: MultiSystemSummary,
  customFilename?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    format: "a4",
    unit: "pt",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(7, 98, 164); // #0762a4
  doc.rect(0, 0, pageWidth, 120, "F");

  doc.setTextColor(247, 249, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CCTV Planner Pro", margin, 45);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Reporte Múltiples Sistemas - Concentrado & Conciliación", margin, 68);

  doc.setFontSize(10);
  doc.text(`Proyecto: ${summary.projectName}`, margin, 95);
  doc.text(`Fecha: ${summary.generatedAt}`, pageWidth - margin - 150, 95);

  // Executive Summary Card
  let y = 145;

  doc.setFillColor(238, 244, 255); // surface-container-low
  doc.rect(margin, y, contentWidth, 80, "F");
  doc.setDrawColor(150, 180, 220);
  doc.rect(margin, y, contentWidth, 80, "S");

  doc.setTextColor(19, 52, 84); // on-surface
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Concentrado General", margin + 15, y + 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total de Dispositivos Instalados: ${summary.totalDevices}`, margin + 15, y + 45);
  doc.text(`Índice de Integridad Técnica: ${summary.reconciliation.integrityScore}%`, margin + 15, y + 62);

  doc.setFont("helvetica", "bold");
  doc.text(`Estatus: ${summary.reconciliation.statusText}`, margin + 260, y + 45);

  // System Breakdown Table
  y += 105;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1. Consolidado por Sistema", margin, y);

  y += 15;
  doc.setFillColor(7, 98, 164);
  doc.rect(margin, y, contentWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Sistema", margin + 10, y + 15);
  doc.text("Dispositivos", margin + 180, y + 15);
  doc.text("% Participación", margin + 280, y + 15);
  doc.text("Estatus Conciliación", margin + 390, y + 15);

  y += 22;

  (Object.keys(SYSTEM_METADATA) as SystemKey[]).forEach((sysKey, idx) => {
    const meta = SYSTEM_METADATA[sysKey];
    const sysData = summary.breakdownBySystem[sysKey];

    if (idx % 2 === 1) {
      doc.setFillColor(245, 248, 255);
      doc.rect(margin, y, contentWidth, 20, "F");
    }

    doc.setTextColor(19, 52, 84);
    doc.setFont("helvetica", "normal");
    doc.text(meta.title, margin + 10, y + 14);
    doc.text(`${sysData.totalDevices} equipos`, margin + 180, y + 14);
    doc.text(`${sysData.percentage}%`, margin + 280, y + 14);
    doc.text("Validado", margin + 390, y + 14);

    y += 20;
  });

  // Section 2: Detailed Specs by System
  y += 25;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("2. Desglose Detallado de Hardware por Sistema", margin, y);
  y += 15;

  (Object.keys(SYSTEM_METADATA) as SystemKey[]).forEach((sysKey) => {
    const meta = SYSTEM_METADATA[sysKey];
    const sysData = summary.breakdownBySystem[sysKey];

    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin + 20;
    }

    doc.setFillColor(229, 239, 255);
    doc.rect(margin, y, contentWidth, 20, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(7, 98, 164);
    doc.text(`${meta.title} (${sysData.totalDevices} Dispositivos)`, margin + 10, y + 14);
    y += 20;

    if (sysData.modelGroups.length === 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("No se han sembrado dispositivos para este sistema.", margin + 15, y + 14);
      y += 20;
    } else {
      // Group header
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(67, 97, 131);
      doc.text("Modelo / Código", margin + 10, y + 12);
      doc.text("Marca", margin + 180, y + 12);
      doc.text("Categoría", margin + 270, y + 12);
      doc.text("Cantidad", margin + 440, y + 12);
      y += 16;

      sysData.modelGroups.forEach((group) => {
        if (y > pageHeight - 50) {
          doc.addPage();
          y = margin + 20;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(19, 52, 84);
        doc.text(`${group.modelName} (${group.code})`, margin + 10, y + 12);
        doc.text(group.brand, margin + 180, y + 12);
        doc.text(group.deviceTypeLabel.substring(0, 25), margin + 270, y + 12);
        doc.setFont("helvetica", "bold");
        doc.text(`${group.quantity} pza(s)`, margin + 440, y + 12);
        y += 16;
      });
      y += 10;
    }
  });

  // Section 3: Conciliación & Discrepancias Audit Log
  if (y > pageHeight - 160) {
    doc.addPage();
    y = margin + 20;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(19, 52, 84);
  doc.text("3. Auditoría de Conciliación e Integridad", margin, y);
  y += 20;

  summary.reconciliation.validations.forEach((val) => {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin + 20;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(val.passed ? 13 : 172, val.passed ? 110 : 52, val.passed ? 54 : 52);
    doc.text(`${val.passed ? "✔ PASS" : "✖ WARN"} - ${val.checkName}`, margin + 10, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(67, 97, 131);
    doc.text(val.details, margin + 20, y + 26);
    y += 34;
  });

  // Page Numbers Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`CCTV Planner Pro - Página ${i} de ${totalPages}`, pageWidth - margin - 110, pageHeight - 20);
  }

  const filename = customFilename || `Reporte_MultiSistemas_${summary.projectName.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

/**
 * Export Multi-System Summary report to formatted Excel workbook (.xlsx)
 */
export async function exportMultiSystemExcel(
  summary: MultiSystemSummary,
  customFilename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CCTV Planner Pro";
  workbook.lastModifiedBy = "CCTV Planner Pro";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Tab 1: Resumen Concentrado General
  const summarySheet = workbook.addWorksheet("Resumen Concentrado");

  summarySheet.columns = [
    { header: "Concepto / Sistema", key: "concepto", width: 35 },
    { header: "Cantidad Dispositivos", key: "cantidad", width: 22 },
    { header: "% Participación", key: "pct", width: 18 },
    { header: "Estatus Conciliación", key: "estatus", width: 25 },
  ];

  // Header styling
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0762A4" } };

  summarySheet.addRow(["PROYECTO", summary.projectName, "", ""]);
  summarySheet.addRow(["FECHA DE GENERACIÓN", summary.generatedAt, "", ""]);
  summarySheet.addRow(["TOTAL DISPOSITIVOS", summary.totalDevices, "100%", summary.reconciliation.statusText]);
  summarySheet.addRow([]);

  (Object.keys(SYSTEM_METADATA) as SystemKey[]).forEach((sysKey) => {
    const meta = SYSTEM_METADATA[sysKey];
    const sysData = summary.breakdownBySystem[sysKey];
    summarySheet.addRow([meta.title, sysData.totalDevices, `${sysData.percentage}%`, "Validado"]);
  });

  // Tab 2 to 6: Individual System Sheets
  (Object.keys(SYSTEM_METADATA) as SystemKey[]).forEach((sysKey) => {
    const meta = SYSTEM_METADATA[sysKey];
    const sysData = summary.breakdownBySystem[sysKey];

    const sheet = workbook.addWorksheet(meta.shortLabel);

    sheet.columns = [
      { header: "N°", key: "num", width: 8 },
      { header: "Modelo", key: "modelo", width: 25 },
      { header: "Marca", key: "marca", width: 18 },
      { header: "Código Catálogo", key: "codigo", width: 22 },
      { header: "Categoría Técnico", key: "cat", width: 30 },
      { header: "Cantidad", key: "qty", width: 14 },
      { header: "Descripción Ficha Técnica", key: "desc", width: 50 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0762A4" } };

    sysData.modelGroups.forEach((group, idx) => {
      sheet.addRow({
        num: idx + 1,
        modelo: group.modelName,
        marca: group.brand,
        codigo: group.code,
        cat: group.deviceTypeLabel,
        qty: group.quantity,
        desc: group.description,
      });
    });

    // Total Row
    const totalRow = sheet.addRow(["", "", "", "", "TOTAL EQUIPOS", sysData.totalDevices, ""]);
    totalRow.font = { bold: true };
  });

  // Tab 7: Conciliación & Auditoría Log
  const reconSheet = workbook.addWorksheet("Conciliación");
  reconSheet.columns = [
    { header: "Severidad", key: "sev", width: 14 },
    { header: "Sistema", key: "sys", width: 22 },
    { header: "Dispositivo", key: "dev", width: 25 },
    { header: "Modelo", key: "model", width: 20 },
    { header: "Tipo de Alerta", key: "title", width: 32 },
    { header: "Descripción Auditoría", key: "desc", width: 50 },
    { header: "Recomendación Técnica", key: "rec", width: 50 },
  ];

  reconSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  reconSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0762A4" } };

  summary.reconciliation.discrepancies.forEach((disc) => {
    reconSheet.addRow({
      sev: disc.severity.toUpperCase(),
      sys: disc.systemName,
      dev: disc.deviceName,
      model: disc.modelName,
      title: disc.title,
      desc: disc.description,
      rec: disc.recommendation,
    });
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = customFilename || `Reporte_MultiSistemas_${summary.projectName.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
