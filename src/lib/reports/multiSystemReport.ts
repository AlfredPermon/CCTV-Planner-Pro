import { getCatalogItems } from "@/lib/catalog/storage";
import { CatalogModel, CatalogType } from "@/lib/catalog/types";
import type { Camera, AccessDevice, VoceoDevice, FireDevice, ParkingDevice, FloorPlan } from "@/lib/cctv/types";

export type SystemKey = "cctv" | "access" | "voceo" | "fire" | "parking";

export interface SystemMeta {
  key: SystemKey;
  title: string;
  shortLabel: string;
  icon: string;
  color: string;
  containerBg: string;
  textColor: string;
  catalogType: CatalogType;
}

export const SYSTEM_METADATA: Record<SystemKey, SystemMeta> = {
  cctv: {
    key: "cctv",
    title: "CCTV",
    shortLabel: "CCTV",
    icon: "videocam",
    color: "#0762a4",
    containerBg: "bg-[#e5efff]",
    textColor: "text-[#0762a4]",
    catalogType: "cameras",
  },
  access: {
    key: "access",
    title: "Control de Acceso",
    shortLabel: "ACCESS",
    icon: "door_front",
    color: "#44674f",
    containerBg: "bg-[#cef5d6]",
    textColor: "text-[#3c5e47]",
    catalogType: "access",
  },
  voceo: {
    key: "voceo",
    title: "Voceo",
    shortLabel: "PAGING",
    icon: "settings_input_antenna",
    color: "#71b2fa",
    containerBg: "bg-[#e5efff]",
    textColor: "text-[#0762a4]",
    catalogType: "voceo",
  },
  fire: {
    key: "fire",
    title: "Incendio",
    shortLabel: "FIRE",
    icon: "cloud_download",
    color: "#ac3434",
    containerBg: "bg-[#fde8e8]",
    textColor: "text-[#ac3434]",
    catalogType: "fire",
  },
  parking: {
    key: "parking",
    title: "Parquímetro",
    shortLabel: "PARKING",
    icon: "directions_car",
    color: "#0d6e36",
    containerBg: "bg-[#cef5d6]",
    textColor: "text-[#0d6e36]",
    catalogType: "parking",
  },
};

export interface DeviceCatalogMatch {
  matched: boolean;
  catalogItem?: CatalogModel;
  modelId: string;
  modelName: string;
  brand: string;
  code: string;
  description: string;
  notes: string;
}

export interface SystemModelGroup {
  modelId: string;
  modelName: string;
  brand: string;
  code: string;
  description: string;
  quantity: number;
  deviceTypeLabel: string;
  catalogMatch: DeviceCatalogMatch;
  devices: Array<{
    id: string;
    name: string;
    floorPlanName: string;
    x: number;
    y: number;
  }>;
}

export interface SystemBreakdown {
  systemKey: SystemKey;
  meta: SystemMeta;
  totalDevices: number;
  percentage: number;
  modelGroups: SystemModelGroup[];
  categoryCounts: Array<{ category: string; count: number }>;
}

export interface DiscrepancyItem {
  id: string;
  systemKey: SystemKey;
  systemName: string;
  deviceId: string;
  deviceName: string;
  modelName: string;
  severity: "high" | "medium" | "low";
  code: "ORPHAN_NO_PLAN" | "INVALID_COORDINATES" | "UNMAPPED_MODEL" | "UNSPECIFIED_PARAMS";
  title: string;
  description: string;
  recommendation: string;
}

export interface ReconciliationReport {
  status: "valid" | "warning" | "error";
  statusText: string;
  totalDevicesChecked: number;
  validDevicesCount: number;
  discrepancyCount: number;
  integrityScore: number;
  discrepancies: DiscrepancyItem[];
  validations: Array<{
    checkName: string;
    passed: boolean;
    details: string;
  }>;
}

export interface ProjectStateInput {
  projectName?: string;
  cameras?: Camera[];
  accessDevices?: AccessDevice[];
  voceoDevices?: VoceoDevice[];
  fireDevices?: FireDevice[];
  parkingDevices?: ParkingDevice[];
  floorPlan?: FloorPlan | null;
  floorPlanAccess?: FloorPlan | null;
  floorPlanVoceo?: FloorPlan | null;
  floorPlanFire?: FloorPlan | null;
  floorPlanParking?: FloorPlan | null;
}

export interface MultiSystemSummary {
  projectName: string;
  generatedAt: string;
  totalDevices: number;
  totalSeededDevices: number;
  systemCounts: Record<SystemKey, number>;
  systemPercentages: Record<SystemKey, number>;
  breakdownBySystem: Record<SystemKey, SystemBreakdown>;
  globalCategoryTotals: Array<{ category: string; count: number; systemKey: SystemKey }>;
  reconciliation: ReconciliationReport;
}

/**
 * Match a device with its corresponding catalog item for rich specs
 */
export function matchDeviceWithCatalog(
  systemKey: SystemKey,
  modelId?: string,
  modelName?: string,
  type?: string
): DeviceCatalogMatch {
  const meta = SYSTEM_METADATA[systemKey];
  const catalog = getCatalogItems(meta.catalogType);

  const queryId = (modelId || "").toLowerCase().trim();
  const queryName = (modelName || "").toLowerCase().trim();
  const queryType = (type || "").toLowerCase().trim();

  let item: CatalogModel | undefined;

  if (queryId) {
    item = catalog.find(
      (c) =>
        c.id.toLowerCase() === queryId ||
        c.modelo.toLowerCase() === queryId ||
        c.codigo.toLowerCase() === queryId
    );
  }

  if (!item && queryName) {
    item = catalog.find(
      (c) =>
        c.modelo.toLowerCase() === queryName ||
        c.id.toLowerCase() === queryName ||
        c.codigo.toLowerCase() === queryName ||
        (c.descripcion || "").toLowerCase().includes(queryName)
    );
  }

  if (!item && queryType) {
    item = catalog.find(
      (c) =>
        c.modelo.toLowerCase().includes(queryType) ||
        c.codigo.toLowerCase().includes(queryType) ||
        (c.descripcion || "").toLowerCase().includes(queryType)
    );
  }

  if (item) {
    return {
      matched: true,
      catalogItem: item,
      modelId: item.id,
      modelName: item.modelo,
      brand: item.marca,
      code: item.codigo,
      description: item.descripcion || "",
      notes: item.notas || "",
    };
  }

  return {
    matched: false,
    modelId: modelId || type || "generic",
    modelName: modelName || (type ? type.toUpperCase() : "Dispositivo Genérico"),
    brand: "Genérico",
    code: modelId || type || "N/A",
    description: "Dispositivo sin plantilla registrada en catálogo",
    notes: "Sembrado manualmente",
  };
}

/**
 * Helper to map camera/device technical type to human readable category label
 */
function getDeviceCategoryLabel(systemKey: SystemKey, rawType?: string, modelName?: string): string {
  const t = (rawType || "").toLowerCase();
  const m = (modelName || "").toLowerCase();

  switch (systemKey) {
    case "cctv":
      if (t === "nvr" || m.includes("nvr") || m.includes("recorder") || m.includes("grabador")) return "NVRs";
      if (t === "switch" || m.includes("switch") || m.includes("poe")) return "Switches PoE";
      return "Cámaras IP";

    case "access":
      if (t.includes("panel") || m.includes("panel") || m.includes("controller") || m.includes("aegis") || m.includes("cloud"))
        return "Paneles Control";
      if (t.includes("lock") || m.includes("chapa") || m.includes("mag") || m.includes("magnetica") || m.includes("boton"))
        return "Chapas Magnéticas";
      return "Lectoras";

    case "voceo":
      if (t.includes("amp") || m.includes("server") || m.includes("gateway") || m.includes("pa2") || m.includes("pa3"))
        return "Amplificadores";
      if (t.includes("mic") || m.includes("mic") || m.includes("a32i") || m.includes("consola"))
        return "Micrófonos Estación";
      return "Altavoces";

    case "fire":
      if (t.includes("pull") || m.includes("estacion") || m.includes("manual") || m.includes("dcp-ams"))
        return "Estaciones Manuales";
      if (t.includes("panel") || m.includes("facp") || m.includes("tablero") || m.includes("la102") || m.includes("fuente"))
        return "Paneles FACP";
      return "Detectores Humo";

    case "parking":
      if (m.includes("lpr") || m.includes("placa") || m.includes("camara")) return "Cámaras LPR";
      if (m.includes("tag") || m.includes("uhf") || m.includes("reader") || m.includes("lector")) return "Lectores & Tags UHF";
      return "Barreras Vehiculares";

    default:
      return "Dispositivos";
  }
}

/**
 * Standard categories per system for structured rendering
 */
const SYSTEM_STANDARD_CATEGORIES: Record<SystemKey, string[]> = {
  cctv: ["Cámaras IP", "NVRs", "Switches PoE"],
  access: ["Lectoras", "Paneles Control", "Chapas Magnéticas"],
  voceo: ["Altavoces", "Amplificadores", "Micrófonos Estación"],
  fire: ["Detectores Humo", "Estaciones Manuales", "Paneles FACP"],
  parking: ["Barreras Vehiculares", "Cámaras LPR", "Lectores & Tags UHF"],
};

/**
 * CORE MATHEMATICAL ENGINE: Aggregates, calculates exact real counts, percentages, and performs technical reconciliation
 */
export function generateMultiSystemSummary(input: ProjectStateInput): MultiSystemSummary {
  const cameras = input.cameras || [];
  const accessDevices = input.accessDevices || [];
  const voceoDevices = input.voceoDevices || [];
  const fireDevices = input.fireDevices || [];
  const parkingDevices = input.parkingDevices || [];

  const floorPlan = input.floorPlan;
  const floorPlanAccess = input.floorPlanAccess || floorPlan;
  const floorPlanVoceo = input.floorPlanVoceo || floorPlan;
  const floorPlanFire = input.floorPlanFire || floorPlan;
  const floorPlanParking = input.floorPlanParking || floorPlan;

  // PURE REAL COUNTS FROM SEEDED CANVAS DEVICES
  const countCctv = cameras.length;
  const countAccess = accessDevices.length;
  const countVoceo = voceoDevices.length;
  const countFire = fireDevices.length;
  const countParking = parkingDevices.length;

  const totalDevices = countCctv + countAccess + countVoceo + countFire + countParking;

  const rawPercentages: Record<SystemKey, number> = {
    cctv: totalDevices > 0 ? (countCctv / totalDevices) * 100 : 0,
    access: totalDevices > 0 ? (countAccess / totalDevices) * 100 : 0,
    voceo: totalDevices > 0 ? (countVoceo / totalDevices) * 100 : 0,
    fire: totalDevices > 0 ? (countFire / totalDevices) * 100 : 0,
    parking: totalDevices > 0 ? (countParking / totalDevices) * 100 : 0,
  };

  const systemPercentages: Record<SystemKey, number> = {
    cctv: Math.round(rawPercentages.cctv * 10) / 10,
    access: Math.round(rawPercentages.access * 10) / 10,
    voceo: Math.round(rawPercentages.voceo * 10) / 10,
    fire: Math.round(rawPercentages.fire * 10) / 10,
    parking: Math.round(rawPercentages.parking * 10) / 10,
  };

  const systemCounts: Record<SystemKey, number> = {
    cctv: countCctv,
    access: countAccess,
    voceo: countVoceo,
    fire: countFire,
    parking: countParking,
  };

  // Helper for model grouping
  const buildSystemBreakdown = (
    systemKey: SystemKey,
    rawList: Array<{
      id: string;
      name?: string;
      modelId?: string;
      modelName?: string;
      type?: string;
      x: number;
      y: number;
    }>,
    plan: FloorPlan | null | undefined
  ): SystemBreakdown => {
    const meta = SYSTEM_METADATA[systemKey];
    const groupMap = new Map<string, SystemModelGroup>();

    rawList.forEach((dev) => {
      const match = matchDeviceWithCatalog(systemKey, dev.modelId, dev.modelName, dev.type);
      const key = `${match.brand}:${match.modelName}`;
      const categoryLabel = getDeviceCategoryLabel(systemKey, dev.type, match.modelName);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          modelId: match.modelId,
          modelName: match.modelName,
          brand: match.brand,
          code: match.code,
          description: match.description,
          quantity: 0,
          deviceTypeLabel: categoryLabel,
          catalogMatch: match,
          devices: [],
        });
      }

      const grp = groupMap.get(key)!;
      grp.quantity += 1;
      grp.devices.push({
        id: dev.id,
        name: dev.name || `${match.modelName} #${grp.quantity}`,
        floorPlanName: plan?.name || "Plano General",
        x: dev.x,
        y: dev.y,
      });
    });

    const modelGroups = Array.from(groupMap.values()).sort((a, b) => b.quantity - a.quantity);

    // Category aggregation
    const catMap = new Map<string, number>();
    // Pre-populate standard categories with 0
    SYSTEM_STANDARD_CATEGORIES[systemKey].forEach((cat) => catMap.set(cat, 0));

    modelGroups.forEach((g) => {
      catMap.set(g.deviceTypeLabel, (catMap.get(g.deviceTypeLabel) || 0) + g.quantity);
    });

    const categoryCounts = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));

    return {
      systemKey,
      meta,
      totalDevices: rawList.length,
      percentage: systemPercentages[systemKey],
      modelGroups,
      categoryCounts,
    };
  };

  const breakdownBySystem: Record<SystemKey, SystemBreakdown> = {
    cctv: buildSystemBreakdown("cctv", cameras, floorPlan),
    access: buildSystemBreakdown("access", accessDevices, floorPlanAccess),
    voceo: buildSystemBreakdown("voceo", voceoDevices, floorPlanVoceo),
    fire: buildSystemBreakdown("fire", fireDevices, floorPlanFire),
    parking: buildSystemBreakdown("parking", parkingDevices, floorPlanParking),
  };

  // Global category totals
  const globalCatMap = new Map<string, { count: number; systemKey: SystemKey }>();
  (Object.keys(breakdownBySystem) as SystemKey[]).forEach((sysKey) => {
    breakdownBySystem[sysKey].categoryCounts.forEach((c) => {
      const key = `${sysKey}:${c.category}`;
      globalCatMap.set(key, { count: c.count, systemKey: sysKey });
    });
  });

  const globalCategoryTotals = Array.from(globalCatMap.entries()).map(([key, val]) => ({
    category: key.split(":")[1],
    count: val.count,
    systemKey: val.systemKey,
  }));

  // RECONCILIATION AUDIT ENGINE
  const discrepancies: DiscrepancyItem[] = [];
  const validations: Array<{ checkName: string; passed: boolean; details: string }> = [];

  let validDevicesCount = 0;

  const auditDeviceList = (
    systemKey: SystemKey,
    list: Array<{ id: string; name?: string; modelId?: string; modelName?: string; type?: string; x: number; y: number }>,
    plan: FloorPlan | null | undefined
  ) => {
    const sysName = SYSTEM_METADATA[systemKey].title;

    list.forEach((dev) => {
      let isDevValid = true;
      const devName = dev.name || `Dispositivo ${dev.id.substring(0, 6)}`;
      const match = matchDeviceWithCatalog(systemKey, dev.modelId, dev.modelName, dev.type);

      // Check 1: Floor Plan assignment
      if (!plan && totalDevices > 0) {
        isDevValid = false;
        discrepancies.push({
          id: `disc_${dev.id}_plan`,
          systemKey,
          systemName: sysName,
          deviceId: dev.id,
          deviceName: devName,
          modelName: match.modelName,
          severity: "high",
          code: "ORPHAN_NO_PLAN",
          title: "Dispositivo Sin Plano de Ubicación",
          description: `El dispositivo ${devName} está registrado en el proyecto pero no tiene plano asignado.`,
          recommendation: "Cargue o vincule el plano de planta correspondiente para ubicar espacialmente el dispositivo.",
        });
      }

      // Check 2: Valid Coordinates
      if (!Number.isFinite(dev.x) || !Number.isFinite(dev.y) || dev.x < 0 || dev.y < 0) {
        isDevValid = false;
        discrepancies.push({
          id: `disc_${dev.id}_coords`,
          systemKey,
          systemName: sysName,
          deviceId: dev.id,
          deviceName: devName,
          modelName: match.modelName,
          severity: "high",
          code: "INVALID_COORDINATES",
          title: "Coordenadas Fuera de Rango",
          description: `Las coordenadas (${dev.x}, ${dev.y}) del dispositivo ${devName} son inválidas.`,
          recommendation: "Re-arrastre o reubique el elemento sobre el lienzo de diseño.",
        });
      }

      // Check 3: Catalog match check
      if (!match.matched) {
        discrepancies.push({
          id: `disc_${dev.id}_catalog`,
          systemKey,
          systemName: sysName,
          deviceId: dev.id,
          deviceName: devName,
          modelName: dev.modelName || dev.type || "Desconocido",
          severity: "low",
          code: "UNMAPPED_MODEL",
          title: "Modelo Genérico No Registrado en Catálogo",
          description: `El modelo '${dev.modelName || dev.type}' no coincide exactamente con ninguna plantilla del catálogo maestro.`,
          recommendation: "Asocie el modelo a una plantilla del catálogo oficial para enriquecer los reportes de cotización.",
        });
      }

      if (isDevValid) {
        validDevicesCount += 1;
      }
    });
  };

  auditDeviceList("cctv", cameras, floorPlan);
  auditDeviceList("access", accessDevices, floorPlanAccess);
  auditDeviceList("voceo", voceoDevices, floorPlanVoceo);
  auditDeviceList("fire", fireDevices, floorPlanFire);
  auditDeviceList("parking", parkingDevices, floorPlanParking);

  validations.push({
    checkName: "Validación de Conteo por Sistema",
    passed: totalDevices >= 0,
    details: `Se procesaron un total de ${totalDevices} dispositivos sembrados distribuidos en ${Object.keys(SYSTEM_METADATA).length} sistemas.`,
  });

  validations.push({
    checkName: "Verificación de Asignación de Planos CAD",
    passed: discrepancies.filter((d) => d.code === "ORPHAN_NO_PLAN").length === 0,
    details:
      discrepancies.filter((d) => d.code === "ORPHAN_NO_PLAN").length === 0
        ? "Todos los elementos están vinculados correctamente a sus respectivos planos."
        : `Se detectaron ${discrepancies.filter((d) => d.code === "ORPHAN_NO_PLAN").length} elementos huérfanos sin plano.`,
  });

  validations.push({
    checkName: "Integridad de Coordenadas y Posicionamiento Spatial",
    passed: discrepancies.filter((d) => d.code === "INVALID_COORDINATES").length === 0,
    details:
      discrepancies.filter((d) => d.code === "INVALID_COORDINATES").length === 0
        ? "Posicionamiento 2D validado con coordenadas dentro del marco."
        : `Se hallaron ${discrepancies.filter((d) => d.code === "INVALID_COORDINATES").length} coordenadas anómalas.`,
  });

  validations.push({
    checkName: "Mapeo con Catálogos Maestros de Hardware",
    passed: discrepancies.filter((d) => d.code === "UNMAPPED_MODEL").length === 0,
    details:
      discrepancies.filter((d) => d.code === "UNMAPPED_MODEL").length === 0
        ? "El 100% de los dispositivos coincide con fichas técnicas del catálogo."
        : `${discrepancies.filter((d) => d.code === "UNMAPPED_MODEL").length} dispositivos utilizan referencias genéricas.`,
  });

  const discrepancyCount = discrepancies.length;
  const highSeverityCount = discrepancies.filter((d) => d.severity === "high").length;

  let reconciliationStatus: "valid" | "warning" | "error" = "valid";
  let statusText = "Información Validada";

  if (highSeverityCount > 0) {
    reconciliationStatus = "error";
    statusText = "Discrepancias Críticas Detectadas";
  } else if (discrepancyCount > 0) {
    reconciliationStatus = "warning";
    statusText = "Observaciones Menores de Catálogo";
  }

  const integrityScore =
    totalDevices > 0
      ? Math.max(0, Math.round(((totalDevices - highSeverityCount * 2 - discrepancyCount * 0.5) / totalDevices) * 100))
      : 100;

  return {
    projectName: input.projectName || "Proyecto CCTV Planner Pro",
    generatedAt: new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    totalDevices,
    totalSeededDevices: totalDevices,
    systemCounts,
    systemPercentages,
    breakdownBySystem,
    globalCategoryTotals,
    reconciliation: {
      status: reconciliationStatus,
      statusText,
      totalDevicesChecked: totalDevices,
      validDevicesCount,
      discrepancyCount,
      integrityScore,
      discrepancies,
      validations,
    },
  };
}
