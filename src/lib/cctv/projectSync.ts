import { normalizeAccessDevices } from "@/lib/access/accessDeviceFactory";
import type { Camera, AccessDevice, VoceoDevice, FireDevice, ParkingDevice, FloorPlan } from "@/lib/cctv/types";

const DB_NAME = "CCTVPlannerDB";
const STORE_NAME = "projects";

export interface ProjectSyncData {
  projectName: string;
  cameras: Camera[];
  accessDevices: AccessDevice[];
  voceoDevices: VoceoDevice[];
  fireDevices: FireDevice[];
  parkingDevices: ParkingDevice[];
  floorPlan: FloorPlan | null;
  floorPlanAccess: FloorPlan | null;
  floorPlanVoceo: FloorPlan | null;
  floorPlanFire: FloorPlan | null;
  floorPlanParking: FloorPlan | null;
}

/**
 * Initialize IndexedDB instance
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB is not available in non-browser environment"));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save project to IndexedDB
 */
export async function saveProjectToDB(project: any): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(project);
        tx.oncomplete = () => resolve();
        tx.onerror = (evt) => {
          console.error("IndexedDB tx error during save:", tx.error || evt);
          resolve();
        };
      } catch (err) {
        console.error("Error creating store transaction in IndexedDB", err);
        resolve();
      }
    });
  } catch (e) {
    console.error("Error saving project to IndexedDB", e);
  }
}

/**
 * Load project by ID from IndexedDB
 */
export async function loadProjectFromDB(id: string): Promise<any | null> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.error("IndexedDB tx error during load:", request.error);
          resolve(null);
        };
      } catch (err) {
        console.error("Error loading project from IndexedDB transaction", err);
        resolve(null);
      }
    });
  } catch (e) {
    console.error("Error loading project from IndexedDB", e);
    return null;
  }
}

/**
 * Load all projects from IndexedDB
 */
export async function loadAllProjectsFromDB(): Promise<any[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error("IndexedDB tx error during loadAll:", request.error);
          resolve([]);
        };
      } catch (err) {
        console.error("Error loading all projects from IndexedDB transaction", err);
        resolve([]);
      }
    });
  } catch (e) {
    console.error("Error loading all projects from IndexedDB", e);
    return [];
  }
}

/**
 * Safely set a key in localStorage without throwing QuotaExceededError
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[projectSync] localStorage quota exceeded for key "${key}". Skipping heavy payload.`);
    return false;
  }
}

/**
 * Strip heavy base64 image data URLs for localStorage fallback storage to keep quota tiny
 */
export function lightenFloorPlanForLocalStorage(fp: FloorPlan | null | undefined): FloorPlan | null {
  if (!fp) return null;
  if (fp.url && fp.url.length > 50000 && fp.url.startsWith("data:")) {
    return {
      ...fp,
      url: "", // Preserve metadata (id, name, width, height, etc.) while omitting huge base64 payload
    };
  }
  return fp;
}

/**
 * Lighten full project object for localStorage fallback
 */
export function lightenProjectForLocalStorage(projectPayload: any): any {
  if (!projectPayload || typeof projectPayload !== "object") return projectPayload;

  const copy = JSON.parse(JSON.stringify(projectPayload));
  if (copy.data) {
    copy.data.floorPlan = lightenFloorPlanForLocalStorage(copy.data.floorPlan);
    copy.data.floorPlanAccess = lightenFloorPlanForLocalStorage(copy.data.floorPlanAccess);
    copy.data.floorPlanVoceo = lightenFloorPlanForLocalStorage(copy.data.floorPlanVoceo);
    copy.data.floorPlanFire = lightenFloorPlanForLocalStorage(copy.data.floorPlanFire);
    copy.data.floorPlanParking = lightenFloorPlanForLocalStorage(copy.data.floorPlanParking);
  }
  if (copy.floorPlan) copy.floorPlan = lightenFloorPlanForLocalStorage(copy.floorPlan);
  if (copy.floorPlanAccess) copy.floorPlanAccess = lightenFloorPlanForLocalStorage(copy.floorPlanAccess);
  if (copy.floorPlanVoceo) copy.floorPlanVoceo = lightenFloorPlanForLocalStorage(copy.floorPlanVoceo);
  if (copy.floorPlanFire) copy.floorPlanFire = lightenFloorPlanForLocalStorage(copy.floorPlanFire);
  if (copy.floorPlanParking) copy.floorPlanParking = lightenFloorPlanForLocalStorage(copy.floorPlanParking);

  return copy;
}

/**
 * Helper to preserve non-empty floor plan image URL if new object lacks one
 */
function safeMergeFloorPlan(newFp: FloorPlan | null | undefined, storageKey: string): FloorPlan | null {
  if (!newFp) return null;
  if (newFp.url && newFp.url.trim().length > 0) return newFp;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existingRaw = localStorage.getItem(storageKey);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        if (existing?.url && existing.url.trim().length > 0) {
          return { ...newFp, url: existing.url };
        }
      }
    } catch {}
  }

  return newFp;
}

/**
 * Synchronously persist project state to localStorage and trigger real-time update event
 */
export function syncPersistProjectState(data: {
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
  annotations?: any[];
}): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  // 1. Save lightweight device lists FIRST (critical for reporting counts)
  if (data.cameras !== undefined) safeSetLocalStorage("cctv-cameras", JSON.stringify(data.cameras));
  if (data.accessDevices !== undefined) safeSetLocalStorage("cctv-accessDevices", JSON.stringify(normalizeAccessDevices(data.accessDevices)));
  if (data.voceoDevices !== undefined) safeSetLocalStorage("cctv-voceoDevices", JSON.stringify(data.voceoDevices));
  if (data.fireDevices !== undefined) safeSetLocalStorage("cctv-fireDevices", JSON.stringify(data.fireDevices));
  if (data.parkingDevices !== undefined) safeSetLocalStorage("cctv-parkingDevices", JSON.stringify(data.parkingDevices));
  if (data.annotations !== undefined) safeSetLocalStorage("cctv-annotations", JSON.stringify(data.annotations));

  // 2. Save floor plans safely preserving existing non-empty image URLs
  if (data.floorPlan !== undefined) {
    const merged = safeMergeFloorPlan(data.floorPlan, "cctv-floorPlan");
    if (!safeSetLocalStorage("cctv-floorPlan", JSON.stringify(merged))) {
      safeSetLocalStorage("cctv-floorPlan", JSON.stringify(lightenFloorPlanForLocalStorage(merged)));
    }
  }
  if (data.floorPlanAccess !== undefined) {
    const merged = safeMergeFloorPlan(data.floorPlanAccess, "cctv-floorPlan-access");
    if (!safeSetLocalStorage("cctv-floorPlan-access", JSON.stringify(merged))) {
      safeSetLocalStorage("cctv-floorPlan-access", JSON.stringify(lightenFloorPlanForLocalStorage(merged)));
    }
  }
  if (data.floorPlanVoceo !== undefined) {
    const merged = safeMergeFloorPlan(data.floorPlanVoceo, "cctv-floorPlan-voceo");
    if (!safeSetLocalStorage("cctv-floorPlan-voceo", JSON.stringify(merged))) {
      safeSetLocalStorage("cctv-floorPlan-voceo", JSON.stringify(lightenFloorPlanForLocalStorage(merged)));
    }
  }
  if (data.floorPlanFire !== undefined) {
    const merged = safeMergeFloorPlan(data.floorPlanFire, "cctv-floorPlan-fire");
    if (!safeSetLocalStorage("cctv-floorPlan-fire", JSON.stringify(merged))) {
      safeSetLocalStorage("cctv-floorPlan-fire", JSON.stringify(lightenFloorPlanForLocalStorage(merged)));
    }
  }
  if (data.floorPlanParking !== undefined) {
    const merged = safeMergeFloorPlan(data.floorPlanParking, "cctv-floorPlan-parking");
    if (!safeSetLocalStorage("cctv-floorPlan-parking", JSON.stringify(merged))) {
      safeSetLocalStorage("cctv-floorPlan-parking", JSON.stringify(lightenFloorPlanForLocalStorage(merged)));
    }
  }

  try {
    window.dispatchEvent(new Event("cctv-project-updated"));
  } catch (e) {
    console.error("Error dispatching cctv-project-updated", e);
  }
}

/**
 * Deep scan and extract seeded devices from any JSON file structure or localStorage/IndexedDB
 */
export function extractDevicesFromProjectPayload(payload: any): ProjectSyncData {
  if (!payload || typeof payload !== "object") {
    return {
      projectName: "Proyecto CCTV Planner Pro",
      cameras: [],
      accessDevices: [],
      voceoDevices: [],
      fireDevices: [],
      parkingDevices: [],
      floorPlan: null,
      floorPlanAccess: null,
      floorPlanVoceo: null,
      floorPlanFire: null,
      floorPlanParking: null,
    };
  }

  let projectName =
    payload?.metadata?.name ||
    payload?.projectName ||
    payload?.name ||
    payload?.project?.name ||
    "Proyecto CCTV Planner Pro";

  // Inspect data wrapper or root payload or inner project
  let dataObj = payload?.data || payload?.project || payload;

  // Extract camera list from potential properties
  const rawCameras =
    dataObj?.cameras ||
    dataObj?.camerasList ||
    dataObj?.cctv ||
    (Array.isArray(dataObj?.devices) ? dataObj.devices.filter((d: any) => d.systemKey === "cctv" || d.fov !== undefined || d.lens !== undefined) : []);

  // Extract access control list
  const rawAccess =
    dataObj?.accessDevices ||
    dataObj?.access ||
    dataObj?.accessControl ||
    (Array.isArray(dataObj?.devices) ? dataObj.devices.filter((d: any) => d.systemKey === "access" || d.readerType || d.lockType) : []);

  // Extract voceo list
  const rawVoceo =
    dataObj?.voceoDevices ||
    dataObj?.voceo ||
    dataObj?.paging ||
    (Array.isArray(dataObj?.devices) ? dataObj.devices.filter((d: any) => d.systemKey === "voceo" || d.speakerType) : []);

  // Extract fire detection list
  const rawFire =
    dataObj?.fireDevices ||
    dataObj?.fire ||
    dataObj?.incendio ||
    (Array.isArray(dataObj?.devices) ? dataObj.devices.filter((d: any) => d.systemKey === "fire" || d.detectorType) : []);

  // Extract parking list
  const rawParking =
    dataObj?.parkingDevices ||
    dataObj?.parking ||
    dataObj?.parquimetro ||
    (Array.isArray(dataObj?.devices) ? dataObj.devices.filter((d: any) => d.systemKey === "parking" || d.barrierType) : []);

  const cameras: Camera[] = Array.isArray(rawCameras) ? rawCameras : [];
  const accessDevices: AccessDevice[] = Array.isArray(rawAccess) ? normalizeAccessDevices(rawAccess) : [];
  const voceoDevices: VoceoDevice[] = Array.isArray(rawVoceo) ? rawVoceo : [];
  const fireDevices: FireDevice[] = Array.isArray(rawFire) ? rawFire : [];
  const parkingDevices: ParkingDevice[] = Array.isArray(rawParking) ? rawParking : [];

  const floorPlan: FloorPlan | null = dataObj?.floorPlan ?? payload?.floorPlan ?? null;
  const floorPlanAccess: FloorPlan | null = dataObj?.floorPlanAccess ?? payload?.floorPlanAccess ?? floorPlan;
  const floorPlanVoceo: FloorPlan | null = dataObj?.floorPlanVoceo ?? payload?.floorPlanVoceo ?? floorPlan;
  const floorPlanFire: FloorPlan | null = dataObj?.floorPlanFire ?? payload?.floorPlanFire ?? floorPlan;
  const floorPlanParking: FloorPlan | null = dataObj?.floorPlanParking ?? payload?.floorPlanParking ?? floorPlan;

  return {
    projectName,
    cameras,
    accessDevices,
    voceoDevices,
    fireDevices,
    parkingDevices,
    floorPlan,
    floorPlanAccess,
    floorPlanVoceo,
    floorPlanFire,
    floorPlanParking,
  };
}

/**
 * Comprehensive async scanner to fetch the active project state from localStorage or IndexedDB
 */
export async function loadActiveProjectDataAsync(): Promise<ProjectSyncData> {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      projectName: "Proyecto CCTV Planner Pro",
      cameras: [],
      accessDevices: [],
      voceoDevices: [],
      fireDevices: [],
      parkingDevices: [],
      floorPlan: null,
      floorPlanAccess: null,
      floorPlanVoceo: null,
      floorPlanFire: null,
      floorPlanParking: null,
    };
  }

  // 1. Check LIVE localStorage keys FIRST (Represents the active canvas state)
  try {
    const camsRaw = localStorage.getItem("cctv-cameras");
    const accessRaw = localStorage.getItem("cctv-accessDevices");
    const voceoRaw = localStorage.getItem("cctv-voceoDevices");
    const fireRaw = localStorage.getItem("cctv-fireDevices");
    const parkingRaw = localStorage.getItem("cctv-parkingDevices");

    const fpRaw = localStorage.getItem("cctv-floorPlan");
    const fpAccessRaw = localStorage.getItem("cctv-floorPlan-access");
    const fpVoceoRaw = localStorage.getItem("cctv-floorPlan-voceo");
    const fpFireRaw = localStorage.getItem("cctv-floorPlan-fire");
    const fpParkingRaw = localStorage.getItem("cctv-floorPlan-parking");

    const cams = camsRaw ? JSON.parse(camsRaw) : [];
    const access = accessRaw ? JSON.parse(accessRaw) : [];
    const voceo = voceoRaw ? JSON.parse(voceoRaw) : [];
    const fire = fireRaw ? JSON.parse(fireRaw) : [];
    const parking = parkingRaw ? JSON.parse(parkingRaw) : [];

    const fp = fpRaw ? JSON.parse(fpRaw) : null;
    const fpAccess = fpAccessRaw ? JSON.parse(fpAccessRaw) : null;
    const fpVoceo = fpVoceoRaw ? JSON.parse(fpVoceoRaw) : null;
    const fpFire = fpFireRaw ? JSON.parse(fpFireRaw) : null;
    const fpParking = fpParkingRaw ? JSON.parse(fpParkingRaw) : null;

    const recents = JSON.parse(localStorage.getItem("cctv-recent-projects") || "[]");
    const projectName = recents[0]?.name || "Proyecto CCTV Planner Pro";

    // If explicit live keys exist in localStorage (even if arrays are empty [] for a new project)
    if (camsRaw !== null || accessRaw !== null || voceoRaw !== null || fireRaw !== null || parkingRaw !== null || fpRaw !== null) {
      return {
        projectName,
        cameras: cams,
        accessDevices: normalizeAccessDevices(access),
        voceoDevices: voceo,
        fireDevices: fire,
        parkingDevices: parking,
        floorPlan: fp,
        floorPlanAccess: fpAccess,
        floorPlanVoceo: fpVoceo,
        floorPlanFire: fpFire,
        floorPlanParking: fpParking,
      };
    }
  } catch (e) {
    console.warn("Error reading live localStorage keys", e);
  }

  // 2. Check cctv-active-project JSON payload fallback
  try {
    const rawActive = localStorage.getItem("cctv-active-project");
    if (rawActive) {
      const parsed = JSON.parse(rawActive);
      const extracted = extractDevicesFromProjectPayload(parsed);
      return extracted;
    }
  } catch (e) {
    console.warn("Error reading cctv-active-project key", e);
  }

  // 3. Fallback scan: query IndexedDB for the most recent project
  try {
    const recents = JSON.parse(localStorage.getItem("cctv-recent-projects") || "[]");
    if (recents.length > 0 && recents[0]?.id) {
      const savedInDB = await loadProjectFromDB(recents[0].id);
      if (savedInDB) {
        return extractDevicesFromProjectPayload(savedInDB);
      }
    }

    const allInDB = await loadAllProjectsFromDB();
    if (allInDB.length > 0) {
      const latest = allInDB.sort((a, b) => {
        const tA = new Date(a.metadata?.lastModified || 0).getTime();
        const tB = new Date(b.metadata?.lastModified || 0).getTime();
        return tB - tA;
      })[0];

      if (latest) {
        return extractDevicesFromProjectPayload(latest);
      }
    }
  } catch (e) {
    console.warn("Error fallback scanning IndexedDB", e);
  }

  return {
    projectName: "Proyecto CCTV Planner Pro",
    cameras: [],
    accessDevices: [],
    voceoDevices: [],
    fireDevices: [],
    parkingDevices: [],
    floorPlan: null,
    floorPlanAccess: null,
    floorPlanVoceo: null,
    floorPlanFire: null,
    floorPlanParking: null,
  };
}
