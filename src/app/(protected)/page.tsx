'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Camera, Upload, Eye, HardDrive, Network, FilePlus, Save, FolderOpen, Clock, ChevronDown, ChevronRight, ChevronLeft, X, SlidersHorizontal, FileJson, Trash2, Megaphone, Flame, Car, Layout, ArrowLeftRight, ArrowUpDown, User, UserCheck, Video, ChevronsRight, BadgeCheck, Undo2, Disc } from 'lucide-react'
import CCTVCanvas from '@/components/cctv/CCTVCanvas'
import CameraCatalog, { VIVOTEK_CAMERAS } from '@/components/cctv/CameraCatalog'
import AccessControlCatalog from '@/components/access/AccessControlCatalog'
import VoceoCatalog from '@/components/voceo/VoceoCatalog'
import FireDetectionCatalog, { FIRE_DEVICES } from '@/components/fire/FireDetectionCatalog'
import ParkingCatalog from '@/components/parking/ParkingCatalog'
import CatalogSidebar, { type CatalogKey, type WorkspaceTabKey } from '@/components/ui/catalog-sidebar'
import CalculationsPanel from '@/components/cctv/CalculationsPanel'
import AssistantPanel from '@/components/cctv/AssistantPanel'
import type { Camera as PlannerCamera, FloorPlan, AccessDevice, VoceoDevice, FireDevice, ParkingDevice, CanvasAnnotation } from '@/lib/cctv/types'
import { calculateDRI, SENSOR_EQUIVALENCES } from '@/lib/cctv/coverage'
import { COLOR_THEME_PRESETS, CAMERA_TYPE_COLORS } from '@/lib/cctv/coverageRenderer'
import { useToast } from '@/hooks/use-toast'
import { getCatalogItems } from '@/lib/catalog/storage'
import {
  DEFAULT_ACCESS_LABEL_FONT_FAMILY,
  DEFAULT_ACCESS_LABEL_FONT_SIZE,
  DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE,
  inferAccessDeviceType,
  inferAccessIconKey,
} from '@/lib/access/device'
import { createSeededAccessDevice, normalizeAccessDevices } from '@/lib/access/accessDeviceFactory'
import { inferVoceoDeviceType } from '@/lib/voceo/device'
import { inferFireDeviceType } from '@/lib/incendio/device'
import {
  syncPersistProjectState,
  extractDevicesFromProjectPayload,
  safeSetLocalStorage,
  lightenProjectForLocalStorage,
  loadActiveProjectDataAsync,
  saveProjectToDB,
  loadProjectFromDB,
} from '@/lib/cctv/projectSync'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import dynamic from 'next/dynamic'

const ExportToPDFDialog = dynamic(
  () => import('@/components/export/ExportToPDFDialog').then(m => m.ExportToPDFDialog),
  { ssr: false, loading: () => <div className="p-4 text-sm text-muted-foreground">Cargando exportación…</div> }
)

export type CameraModelUndoEntry = {
  cameraId: string
  prevProps: Partial<PlannerCamera>
  newProps: Partial<PlannerCamera>
  prevModelDisplay: string
  newModelDisplay: string
}

export interface ProjectMetadata {
  id: string
  name: string
  description: string
  lastModified: string
  version: string
}

export interface SavedProject {
  id: string
  metadata: ProjectMetadata
  data: {
    floorPlan: FloorPlan | null
    floorPlanAccess?: FloorPlan | null
    floorPlanVoceo?: FloorPlan | null
    floorPlanFire?: FloorPlan | null
    floorPlanParking?: FloorPlan | null
    cameras: Camera[]
    iconScales: Record<string, number>
    accessDevices: AccessDevice[]
    voceoDevices?: VoceoDevice[]
    fireDevices?: FireDevice[]
    parkingDevices?: ParkingDevice[]
    annotations?: CanvasAnnotation[]
  }
}

type Camera = PlannerCamera

export default function CCTVPlanningTool() {
  const [cameras, setCameras] = useState<Camera[]>([])

  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [floorPlanAccess, setFloorPlanAccess] = useState<FloorPlan | null>(null)
  const [floorPlanVoceo, setFloorPlanVoceo] = useState<FloorPlan | null>(null)
  const [floorPlanFire, setFloorPlanFire] = useState<FloorPlan | null>(null)
  const [floorPlanParking, setFloorPlanParking] = useState<FloorPlan | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [accessDevices, setAccessDevices] = useState<AccessDevice[]>([])
  const [voceoDevices, setVoceoDevices] = useState<VoceoDevice[]>([])
  const [fireDevices, setFireDevices] = useState<FireDevice[]>([])
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [selectedAccessDevice, setSelectedAccessDevice] = useState<string | null>(null)
  const [selectedVoceoDevice, setSelectedVoceoDevice] = useState<string | null>(null)
  const [selectedFireDevice, setSelectedFireDevice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>('design')
  const [activeView, setActiveView] = useState<'cameras' | 'parking' | 'access' | 'voceo' | 'fire' | 'combined'>('combined')
  const [iconScales, setIconScales] = useState<Record<string, number>>({})
  const [showScaleInstruction, setShowScaleInstruction] = useState(false)
  const [defineScaleMode, setDefineScaleMode] = useState(false)
  const [scaleInputOpen, setScaleInputOpen] = useState(false)
  const [realDistance, setRealDistance] = useState<string>('')
  const [blockBackground, setBlockBackground] = useState<boolean>(false)
  const scaleSelectionRef = useRef<{ ax: number; ay: number; bx: number; by: number; pixelDistance: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogKey | null>(null)
  const [catalogClosing, setCatalogClosing] = useState(false)
  const [propertiesVisible, setPropertiesVisible] = useState(false)
  const [propertiesMinimized, setPropertiesMinimized] = useState(false)
  const [propertiesOpacity, setPropertiesOpacity] = useState(0.9)
  // Estado de visibilidad de líneas FOV — persiste en sessionStorage durante la sesión
  const [hideFovLines, setHideFovLines] = useState<boolean>(() => {
    try { return sessionStorage.getItem('cctv-hide-fov-lines') === '1' } catch { return false }
  })
  const handleHideFovLinesChange = (v: boolean) => {
    setHideFovLines(v)
    try { sessionStorage.setItem('cctv-hide-fov-lines', v ? '1' : '0') } catch { }
  }
  const { toast } = useToast()
  const [flashDeviceId, setFlashDeviceId] = useState<string | null>(null)
  const handleTriggerFlash = useCallback((id: string) => {
    setFlashDeviceId(id)
    setTimeout(() => setFlashDeviceId(null), 1200)
  }, [])

  const cameraModelUndoStackRef = useRef<CameraModelUndoEntry[]>([])
  const [cameraUndoCount, setCameraUndoCount] = useState<number>(0)

  const handleRecordModelChange = useCallback((entry: CameraModelUndoEntry) => {
    cameraModelUndoStackRef.current.push(entry)
    setCameraUndoCount(cameraModelUndoStackRef.current.length)
  }, [])
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [dontShowOnboardingAgain, setDontShowOnboardingAgain] = useState(true)
  const [parkingDevices, setParkingDevices] = useState<ParkingDevice[]>([])
  const [selectedParkingDevice, setSelectedParkingDevice] = useState<string | null>(null)
  const [parkingSeedModel, setParkingSeedModel] = useState<any | null>(null)
  const [parkingStatus, setParkingStatus] = useState<string>('Selecciona Parquímetro para iniciar')
  const [fireSeedModel, setFireSeedModel] = useState<any | null>(null)
  const [fireStatus, setFireStatus] = useState<string>('Selecciona Dispositivo de Incendio para iniciar')
  const [cameraSeedModel, setCameraSeedModel] = useState<any | null>(null)
  const [cameraStatus, setCameraStatus] = useState<string>('Selecciona Cámara para iniciar')
  const [accessSeedModel, setAccessSeedModel] = useState<any | null>(null)
  const [accessStatus, setAccessStatus] = useState<string>('Selecciona Dispositivo de Acceso para iniciar')
  const [voceoSeedModel, setVoceoSeedModel] = useState<any | null>(null)
  const [voceoStatus, setVoceoStatus] = useState<string>('Selecciona Dispositivo de Voceo para iniciar')
  const [clearCanvasToken, setClearCanvasToken] = useState<number>(0)
  const [isMounted, setIsMounted] = useState(false)

  const [navbarActionsHost, setNavbarActionsHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
    const syncHost = () => {
      const el = document.getElementById('navbar-primary-actions')
      if (el) {
        setNavbarActionsHost(prev => (prev === el ? prev : el))
      }
    }
    syncHost()
    const timer = setTimeout(syncHost, 50)
    const timer2 = setTimeout(syncHost, 300)
    const observer = new MutationObserver(syncHost)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const hasSelectedElement = !!(
      selectedCamera ||
      selectedAccessDevice ||
      selectedVoceoDevice ||
      selectedFireDevice ||
      selectedParkingDevice
    )
    if (!hasSelectedElement) {
      setPropertiesVisible(false)
    }
  }, [selectedCamera, selectedAccessDevice, selectedVoceoDevice, selectedFireDevice, selectedParkingDevice])

  // Project Management State
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null)
  const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [confirmNewProjectOpen, setConfirmNewProjectOpen] = useState(false)
  const [projectNameInput, setProjectNameInput] = useState('')
  const [projectDescInput, setProjectDescInput] = useState('')
  const [projectSaveSuccess, setProjectSaveSuccess] = useState<{ name: string, path: string } | null>(null)

  useEffect(() => {
    const recents = localStorage.getItem('cctv-recent-projects')
    if (recents) setRecentProjects(JSON.parse(recents))
  }, [])

  useEffect(() => {
    localStorage.setItem('cctv-recent-projects', JSON.stringify(recentProjects))
  }, [recentProjects])

  const handleNewProject = () => {
    setConfirmNewProjectOpen(true)
  }

  const executeNewProject = () => {
    setCameras([])
    setAccessDevices([])
    setVoceoDevices([])
    setFireDevices([])
    setParkingDevices([])
    setAnnotations([])
    setFloorPlan(null)
    setFloorPlanAccess(null)
    setFloorPlanVoceo(null)
    setFloorPlanFire(null)
    setFloorPlanParking(null)
    setSelectedCamera(null)
    setSelectedAccessDevice(null)
    setSelectedVoceoDevice(null)
    setSelectedFireDevice(null)
    setSelectedParkingDevice(null)
    setParkingSeedModel(null)
    setParkingStatus('Selecciona Parquímetro para iniciar')
    setFireSeedModel(null)
    setFireStatus('Selecciona Dispositivo de Incendio para iniciar')
    setCameraSeedModel(null)
    setCameraStatus('Selecciona Cámara para iniciar')
    setAccessSeedModel(null)
    setAccessStatus('Selecciona Dispositivo de Acceso para iniciar')
    setVoceoSeedModel(null)
    setVoceoStatus('Selecciona Dispositivo de Voceo para iniciar')
    setIconScales({})
    setCurrentProject(null)
    setConfirmNewProjectOpen(false)

    try {
      localStorage.removeItem('cctv-active-project')
    } catch {}

    syncPersistProjectState({
      projectName: 'Nuevo Proyecto',
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
      annotations: [],
    })
  }

  const handleSaveProjectClick = () => {
    if (currentProject) {
      setProjectNameInput(currentProject.name)
      setProjectDescInput(currentProject.description)
    } else {
      setProjectNameInput('')
      setProjectDescInput('')
    }
    setSaveDialogOpen(true)
  }

  const executeSaveProject = async () => {
    const trimmedName = projectNameInput.trim()
    if (!trimmedName) return

    try {
      // Determine ID: keep existing if name matches (Update), otherwise generate new (Save As)
      const isUpdate = currentProject && currentProject.name === trimmedName
      const projectId = isUpdate ? currentProject.id : crypto.randomUUID()

      const meta: ProjectMetadata = {
        id: projectId,
        name: trimmedName,
        description: projectDescInput,
        lastModified: new Date().toISOString(),
        version: '1.0'
      }

      const projectData: SavedProject = {
        id: meta.id,
        metadata: meta,
        data: {
          floorPlan,
          floorPlanAccess,
          floorPlanVoceo,
          floorPlanFire,
          floorPlanParking,
          cameras,
          iconScales,
          accessDevices,
          voceoDevices,
          fireDevices,
          parkingDevices,
          annotations
        }
      }

      // 1. Save to IndexedDB for "Recent Projects" auto-load capability
      try {
        await saveProjectToDB(projectData)
      } catch (dbErr) {
        console.error('Error saving project to IndexedDB:', dbErr)
      }

      // 2. Safe save to localStorage using lightened floor plan so quota is never exceeded
      try {
        safeSetLocalStorage('cctv-active-project', JSON.stringify(lightenProjectForLocalStorage(projectData)))
      } catch (lsErr) {
        console.error('Error setting cctv-active-project in localStorage:', lsErr)
      }

      // 3. Persist individual device arrays & floor plans
      try {
        syncPersistProjectState({
          projectName: meta.name,
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
          annotations,
        })
      } catch (syncErr) {
        console.error('Error in syncPersistProjectState:', syncErr)
      }

      // 4. Trigger JSON file download safely
      try {
        const jsonContent = JSON.stringify(projectData, null, 2)
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${trimmedName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.cctv.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (dlErr) {
        console.error('Error triggering project JSON download:', dlErr)
      }

      // 5. Update state for current project and recent list
      setCurrentProject(meta)
      setRecentProjects(prev => {
        const filtered = prev.filter(p => p.id !== meta.id)
        const updated = [meta, ...filtered].slice(0, 5)
        try {
          localStorage.setItem('cctv-recent-projects', JSON.stringify(updated))
        } catch (e) {
          console.warn('Could not persist cctv-recent-projects to localStorage:', e)
        }
        return updated
      })

      setSaveDialogOpen(false)
      setProjectSaveSuccess({ name: meta.name, path: 'Descargas (Local)' })
      setTimeout(() => setProjectSaveSuccess(null), 3000)
    } catch (err) {
      console.error('Error executing save project:', err)
      toast({
        title: 'Error al guardar',
        description: 'Ocurrió un problema inesperado al procesar la información del proyecto.',
        variant: 'destructive',
      })
    }
  }

  const handleOpenProjectClick = () => {
    document.getElementById('project-upload')?.click()
  }

  const handleProjectFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const rawText = event.target?.result as string
        if (!rawText || !rawText.trim()) throw new Error('Archivo vacío')

        const json = JSON.parse(rawText)
        const extracted = extractDevicesFromProjectPayload(json)

        const meta: ProjectMetadata = {
          id: json?.metadata?.id || json?.id || crypto.randomUUID(),
          name: extracted.projectName || file.name.replace(/\.[^/.]+$/, ''),
          description: json?.metadata?.description || json?.description || 'Proyecto cargado desde archivo local',
          lastModified: json?.metadata?.lastModified || new Date().toISOString(),
          version: json?.metadata?.version || '1.0'
        }

        const fullProjectObj: SavedProject = {
          id: meta.id,
          metadata: meta,
          data: {
            floorPlan: extracted.floorPlan,
            floorPlanAccess: extracted.floorPlanAccess,
            floorPlanVoceo: extracted.floorPlanVoceo,
            floorPlanFire: extracted.floorPlanFire,
            floorPlanParking: extracted.floorPlanParking,
            cameras: extracted.cameras,
            iconScales: json?.data?.iconScales || json?.iconScales || {},
            accessDevices: extracted.accessDevices,
            voceoDevices: extracted.voceoDevices,
            fireDevices: extracted.fireDevices,
            parkingDevices: extracted.parkingDevices,
            annotations: json?.data?.annotations || json?.annotations || []
          }
        }

        // Restore React state
        setFloorPlan(extracted.floorPlan)
        setFloorPlanAccess(extracted.floorPlanAccess)
        setFloorPlanVoceo(extracted.floorPlanVoceo)
        setFloorPlanFire(extracted.floorPlanFire)
        setFloorPlanParking(extracted.floorPlanParking)
        setCameras(extracted.cameras)
        setIconScales(fullProjectObj.data.iconScales)
        setAccessDevices(extracted.accessDevices)
        setVoceoDevices(extracted.voceoDevices)
        setFireDevices(extracted.fireDevices)
        setParkingDevices(extracted.parkingDevices)
        setAnnotations(fullProjectObj.data.annotations ?? [])
        setCurrentProject(meta)

        // Immediately persist active project for real-time reporting sync safely without hitting base64 quota
        safeSetLocalStorage('cctv-active-project', JSON.stringify(lightenProjectForLocalStorage(fullProjectObj)))
        syncPersistProjectState({
          projectName: meta.name,
          cameras: extracted.cameras,
          accessDevices: extracted.accessDevices,
          voceoDevices: extracted.voceoDevices,
          fireDevices: extracted.fireDevices,
          parkingDevices: extracted.parkingDevices,
          floorPlan: extracted.floorPlan,
          floorPlanAccess: extracted.floorPlanAccess,
          floorPlanVoceo: extracted.floorPlanVoceo,
          floorPlanFire: extracted.floorPlanFire,
          floorPlanParking: extracted.floorPlanParking,
          annotations: fullProjectObj.data.annotations,
        })

        // Update recents and DB
        await saveProjectToDB(fullProjectObj)
        setRecentProjects(prev => {
          const filtered = prev.filter(p => p.id !== meta.id)
          return [meta, ...filtered].slice(0, 5)
        })
      } catch (err) {
        console.error('Error opening project file:', err)
        alert('Error al abrir el proyecto: No se pudo procesar el contenido del archivo JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const loadRecentProject = async (project: ProjectMetadata) => {
    try {
      const saved = await loadProjectFromDB(project.id)
      if (saved) {
        const fp = saved.data.floorPlan ?? null
        const fpAccess = saved.data.floorPlanAccess ?? fp
        const fpVoceo = saved.data.floorPlanVoceo ?? fp
        const fpFire = saved.data.floorPlanFire ?? fp
        const fpParking = saved.data.floorPlanParking ?? fp

        const cams = saved.data.cameras ?? []
        const access = normalizeAccessDevices(saved.data.accessDevices ?? [])
        const voceo = saved.data.voceoDevices ?? []
        const fire = saved.data.fireDevices ?? []
        const parking = saved.data.parkingDevices ?? []
        const ann = saved.data.annotations ?? []

        setFloorPlan(fp)
        setFloorPlanAccess(fpAccess)
        setFloorPlanVoceo(fpVoceo)
        setFloorPlanFire(fpFire)
        setFloorPlanParking(fpParking)
        setCameras(cams)
        setIconScales(saved.data.iconScales ?? {})
        setAccessDevices(access)
        setVoceoDevices(voceo)
        setFireDevices(fire)
        setParkingDevices(parking)
        setAnnotations(ann)
        setCurrentProject(saved.metadata)

        syncPersistProjectState({
          projectName: saved.metadata.name,
          cameras: cams,
          accessDevices: access,
          voceoDevices: voceo,
          fireDevices: fire,
          parkingDevices: parking,
          floorPlan: fp,
          floorPlanAccess: fpAccess,
          floorPlanVoceo: fpVoceo,
          floorPlanFire: fpFire,
          floorPlanParking: fpParking,
          annotations: ann,
        })

        // Move to top of recents
        setRecentProjects(prev => {
          const filtered = prev.filter(p => p.id !== project.id)
          return [project, ...filtered]
        })
      } else {
        alert('No se encontró el contenido del proyecto en la caché local. Por favor, ábralo manualmente desde el archivo.')
      }
    } catch {
      alert('Error al cargar el proyecto reciente.')
    }
  }

  useEffect(() => {
    async function restoreWorkspaceState() {
      try {
        const fpRaw = localStorage.getItem('cctv-floorPlan')
        const fpAccessRaw = localStorage.getItem('cctv-floorPlan-access')
        const fpVoceoRaw = localStorage.getItem('cctv-floorPlan-voceo')
        const fpFireRaw = localStorage.getItem('cctv-floorPlan-fire')
        const fpParkingRaw = localStorage.getItem('cctv-floorPlan-parking')

        let fp = fpRaw ? JSON.parse(fpRaw) : null
        let fpAccess = fpAccessRaw ? JSON.parse(fpAccessRaw) : null
        let fpVoceo = fpVoceoRaw ? JSON.parse(fpVoceoRaw) : null
        let fpFire = fpFireRaw ? JSON.parse(fpFireRaw) : null
        let fpParking = fpParkingRaw ? JSON.parse(fpParkingRaw) : null

        // If any floor plan URL is missing or empty, recover full resolution image from active project or IndexedDB
        if (
          (fp && (!fp.url || fp.url === '')) ||
          (fpAccess && (!fpAccess.url || fpAccess.url === '')) ||
          (fpVoceo && (!fpVoceo.url || fpVoceo.url === '')) ||
          (fpFire && (!fpFire.url || fpFire.url === '')) ||
          (fpParking && (!fpParking.url || fpParking.url === ''))
        ) {
          const recovered = await loadActiveProjectDataAsync()
          if (recovered.floorPlan?.url) fp = recovered.floorPlan
          if (recovered.floorPlanAccess?.url) fpAccess = recovered.floorPlanAccess
          if (recovered.floorPlanVoceo?.url) fpVoceo = recovered.floorPlanVoceo
          if (recovered.floorPlanFire?.url) fpFire = recovered.floorPlanFire
          if (recovered.floorPlanParking?.url) fpParking = recovered.floorPlanParking
        }

        if (fp) setFloorPlan(fp)
        if (fpAccess) setFloorPlanAccess(fpAccess)
        if (fpVoceo) setFloorPlanVoceo(fpVoceo)
        if (fpFire) setFloorPlanFire(fpFire)
        if (fpParking) setFloorPlanParking(fpParking)

        const cams = localStorage.getItem('cctv-cameras')
        const sel = localStorage.getItem('cctv-selectedCamera')
        const scales = localStorage.getItem('cctv-iconScales')
        const devices = localStorage.getItem('cctv-accessDevices')
        const selDev = localStorage.getItem('cctv-selectedAccessDevice')
        const voceos = localStorage.getItem('cctv-voceoDevices')
        const selVo = localStorage.getItem('cctv-selectedVoceoDevice')
        const fires = localStorage.getItem('cctv-fireDevices')
        const selFire = localStorage.getItem('cctv-selectedFireDevice')
        const parking = localStorage.getItem('cctv-parkingDevices')
        const selParking = localStorage.getItem('cctv-selectedParkingDevice')
        const ann = localStorage.getItem('cctv-annotations')

        if (cams) setCameras(JSON.parse(cams))
        if (sel) setSelectedCamera(JSON.parse(sel))
        if (scales) setIconScales(JSON.parse(scales))
        if (devices) setAccessDevices(normalizeAccessDevices(JSON.parse(devices)))
        if (selDev) setSelectedAccessDevice(JSON.parse(selDev))
        if (voceos) setVoceoDevices(JSON.parse(voceos))
        if (selVo) setSelectedVoceoDevice(JSON.parse(selVo))
        if (fires) setFireDevices(JSON.parse(fires))
        if (selFire) setSelectedFireDevice(JSON.parse(selFire))
        if (parking) setParkingDevices(JSON.parse(parking))
        if (selParking) setSelectedParkingDevice(JSON.parse(selParking))
        if (ann) setAnnotations(JSON.parse(ann))
      } catch (err) {
        console.error('Error restoring workspace state', err)
      }
    }

    restoreWorkspaceState()
  }, [])
  useEffect(() => {
    try {
      const shown = localStorage.getItem('cctv-onboarding-shown')
      if (!shown) setOnboardingOpen(true)
    } catch { }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCamera(null)
        setSelectedAccessDevice(null)
        setSelectedVoceoDevice(null)
        setSelectedFireDevice(null)
        setSelectedParkingDevice(null)
        setPropertiesVisible(false)
        setPropertiesMinimized(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (activeView === 'access' && !floorPlanAccess && floorPlan) {
      const copy: FloorPlan = { ...floorPlan, id: crypto.randomUUID() }
      setFloorPlanAccess(copy)
    }
    if (activeView === 'voceo' && !floorPlanVoceo && floorPlan) {
      const copy: FloorPlan = { ...floorPlan, id: crypto.randomUUID() }
      setFloorPlanVoceo(copy)
    }
    if (activeView === 'fire' && !floorPlanFire && floorPlan) {
      const copy: FloorPlan = { ...floorPlan, id: crypto.randomUUID() }
      setFloorPlanFire(copy)
    }
    if (activeView === 'parking' && !floorPlanParking && floorPlan) {
      const copy: FloorPlan = { ...floorPlan, id: crypto.randomUUID() }
      setFloorPlanParking(copy)
    }
  }, [activeView, floorPlan, floorPlanAccess, floorPlanVoceo, floorPlanFire, floorPlanParking])

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem('cctv-floorPlan', JSON.stringify(floorPlan))
        localStorage.setItem('cctv-floorPlan-access', JSON.stringify(floorPlanAccess))
        localStorage.setItem('cctv-floorPlan-voceo', JSON.stringify(floorPlanVoceo))
        localStorage.setItem('cctv-floorPlan-fire', JSON.stringify(floorPlanFire))
        localStorage.setItem('cctv-floorPlan-parking', JSON.stringify(floorPlanParking))
        localStorage.setItem('cctv-cameras', JSON.stringify(cameras))
        localStorage.setItem('cctv-selectedCamera', JSON.stringify(selectedCamera))
        localStorage.setItem('cctv-iconScales', JSON.stringify(iconScales))
        localStorage.setItem('cctv-accessDevices', JSON.stringify(accessDevices))
        localStorage.setItem('cctv-selectedAccessDevice', JSON.stringify(selectedAccessDevice))
        localStorage.setItem('cctv-voceoDevices', JSON.stringify(voceoDevices))
        localStorage.setItem('cctv-selectedVoceoDevice', JSON.stringify(selectedVoceoDevice))
        localStorage.setItem('cctv-fireDevices', JSON.stringify(fireDevices))
        localStorage.setItem('cctv-selectedFireDevice', JSON.stringify(selectedFireDevice))
        localStorage.setItem('cctv-parkingDevices', JSON.stringify(parkingDevices))
        localStorage.setItem('cctv-selectedParkingDevice', JSON.stringify(selectedParkingDevice))
        localStorage.setItem('cctv-annotations', JSON.stringify(annotations))
        window.dispatchEvent(new Event('cctv-project-updated'))
      } catch { }
    }, 400)
    return () => clearTimeout(timeout)
  }, [
    floorPlan,
    floorPlanAccess,
    floorPlanVoceo,
    floorPlanFire,
    floorPlanParking,
    cameras,
    selectedCamera,
    iconScales,
    accessDevices,
    selectedAccessDevice,
    voceoDevices,
    selectedVoceoDevice,
    fireDevices,
    selectedFireDevice,
    parkingDevices,
    selectedParkingDevice,
    annotations
  ])

  const extractCameraSequence = (label: string) => {
    const match = label.match(/(\d+)\s*$/)
    if (!match) return null
    const value = Number(match[1])
    return Number.isFinite(value) ? value : null
  }
  const extractVoceoSequence = (label: string) => {
    const match = label.match(/(\d+)\s*$/)
    if (!match) return null
    const value = Number(match[1])
    return Number.isFinite(value) ? value : null
  }
  const getNextCameraSequence = () => {
    const used = new Set<number>()
    cameras.forEach(cam => {
      const seq = cam.sequence ?? extractCameraSequence(cam.name)
      if (seq) used.add(seq)
    })
    let next = 1
    while (used.has(next)) next += 1
    return next
  }
  const getNextVoceoSequence = () => {
    const used = new Set<number>()
    voceoDevices.forEach((d) => {
      const seq = extractVoceoSequence(d.name)
      if (seq) used.add(seq)
    })
    let next = 1
    while (used.has(next)) next += 1
    return next
  }
  const resolveCameraModelName = (type: Camera['type'], modelId?: string) => {
    if (modelId) {
      const lower = modelId.toLowerCase()
      const byVivotek = VIVOTEK_CAMERAS.find(c => c.id.toLowerCase() === lower || c.model.toLowerCase() === lower)
      if (byVivotek?.model) return byVivotek.model
      const catalogCustom = typeof window !== 'undefined' ? getCatalogItems('cameras') : []
      const byCustom = catalogCustom.find(c => (c.id && c.id.toLowerCase() === lower) || (c.modelo && c.modelo.toLowerCase() === lower) || (c.codigo && c.codigo.toLowerCase() === lower))
      if (byCustom?.modelo) return byCustom.modelo
    }
    const byType = VIVOTEK_CAMERAS.find(c => c.type === type)
    return byType?.model ?? type.toUpperCase()
  }

  const handleAddCamera = (cameraType: Camera['type'], modelId?: string, modelNameOverride?: string) => {
    if (!floorPlan) return
    const sequence = getNextCameraSequence()
    const modelName = modelNameOverride || resolveCameraModelName(cameraType, modelId)
    const newCamera: Camera = {
      id: crypto.randomUUID(),
      type: cameraType,
      name: `${modelName} - ${sequence}`,
      modelId,
      modelName,
      sequence,
      x: 400,
      y: 300,
      rotation: 0,
      fov: cameraType === 'fisheye' ? 360 : cameraType === 'panoramic' ? 180 : cameraType === 'ptz' ? 60 : 90,
      resolution: '1920x1080',
      bitrate: 4,
      fps: 30,
      labelOffsetX: 0,
      labelOffsetY: -20,
      labelVisible: true,
      labelFontSize: 11,
      labelFontFamily: 'sans-serif',
      labelFontWeight: 'normal',
      labelFontStyle: 'normal',
      labelFontColor: '#1e293b',
      distanceToObject: 15,
      customRadiusMeters: 15,
      installationHeight: 4,
      objectHeight: 2,
      cdvWidth: 27.22,
      viewAngle1: 95,
      viewAngle2: 69,
      coverageOpacity: 0.5
    }
    setCameras([...cameras, newCamera])
    setSelectedCamera(newCamera.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleAddCameraWithoutLegend = (cameraType: Camera['type'], modelId?: string, modelNameOverride?: string) => {
    if (!floorPlan) return
    const sequence = getNextCameraSequence()
    const modelName = modelNameOverride || resolveCameraModelName(cameraType, modelId)
    const newCamera: Camera = {
      id: crypto.randomUUID(),
      type: cameraType,
      name: '',
      modelId,
      modelName,
      sequence,
      x: 400,
      y: 300,
      rotation: 0,
      fov: cameraType === 'fisheye' ? 360 : cameraType === 'panoramic' ? 180 : cameraType === 'ptz' ? 60 : 90,
      resolution: '1920x1080',
      bitrate: 4,
      fps: 30,
      labelOffsetX: 0,
      labelOffsetY: -20,
      labelVisible: false,
      labelFontSize: 11,
      labelFontFamily: 'sans-serif',
      labelFontWeight: 'normal',
      labelFontStyle: 'normal',
      labelFontColor: '#1e293b',
      distanceToObject: 15,
      customRadiusMeters: 15,
      installationHeight: 4,
      objectHeight: 2,
      cdvWidth: 27.22,
      viewAngle1: 95,
      viewAngle2: 69,
      coverageOpacity: 0.5
    }
    setCameras([...cameras, newCamera])
    setSelectedCamera(newCamera.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleUpdateCamera = (id: string, updates: Partial<Camera>) => {
    setCameras((prev) =>
      prev.map((cam) => {
        if (cam.id !== id) return cam
        const next = { ...cam, ...updates }
        if (updates.type || updates.modelId || updates.modelName) {
          const sequence = next.sequence ?? extractCameraSequence(next.name) ?? 1
          const modelName = updates.modelName ?? resolveCameraModelName(next.type, updates.modelId ?? cam.modelId)
          const name = updates.name ?? (sequence ? `${modelName} - ${sequence}` : `${modelName}`)
          return { ...next, modelId: updates.modelId ?? cam.modelId, modelName, sequence, name }
        }
        return next
      })
    )
  }

  const handleUndoCameraModelChange = useCallback(() => {
    const stack = cameraModelUndoStackRef.current
    if (stack.length === 0) return false

    const entry = stack.pop()!
    setCameraUndoCount(stack.length)

    handleUpdateCamera(entry.cameraId, entry.prevProps)
    setSelectedCamera(entry.cameraId)
    setPropertiesVisible(true)

    handleTriggerFlash(entry.cameraId)

    toast({
      title: 'Modelo Restaurado (Ctrl + Z)',
      description: `Cámara ${entry.prevProps.sequence ? '#' + entry.prevProps.sequence : ''}: Se restauró el modelo anterior de "${entry.newModelDisplay}" a "${entry.prevModelDisplay}".`,
      duration: 4000,
    })

    return true
  }, [handleTriggerFlash, toast])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement
        const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        if (!isTextInput && cameraModelUndoStackRef.current.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          handleUndoCameraModelChange()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true)
  }, [handleUndoCameraModelChange])

  const handleDeleteCamera = (id: string) => {
    setCameras((prev) => prev.filter((cam) => cam.id !== id))
    if (selectedCamera === id) {
      setSelectedCamera(null)
    }
  }

  const handleAddAccessDevice = (type: AccessDevice['type'], modelId?: string, modelName?: string, iconKey?: string) => {
    const planForAccess = activeView === 'access' ? (floorPlanAccess ?? floorPlan) : floorPlan
    if (!planForAccess) return
    const idx = accessDevices.length + 1
    const newDevice = createSeededAccessDevice({
      type,
      idx,
      modelId,
      modelName,
      iconKey,
      withLegend: true
    }) as AccessDevice
    // simple validation: avoid overlap with cameras in combined view
    const conflict = cameras.some(c => Math.abs(c.x - newDevice.x) < 8 && Math.abs(c.y - newDevice.y) < 8)
    if (conflict) { newDevice.x += 24; newDevice.y += 24 }
    setAccessDevices([...accessDevices, newDevice])
    setSelectedAccessDevice(newDevice.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleUpdateAccessDevice = (id: string, updates: Partial<AccessDevice>) => {
    setAccessDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
  }

  const handleDeleteAccessDevice = (id: string) => {
    setAccessDevices((prev) => prev.filter((d) => d.id !== id))
    if (selectedAccessDevice === id) setSelectedAccessDevice(null)
  }

  const handleAddAccessDeviceWithoutLegend = (type: AccessDevice['type'], modelId?: string, modelName?: string, iconKey?: string) => {
    const planForAccess = activeView === 'access' ? (floorPlanAccess ?? floorPlan) : floorPlan
    if (!planForAccess) return
    const idx = accessDevices.length + 1
    const newDevice = createSeededAccessDevice({
      type,
      idx,
      modelId,
      modelName,
      iconKey,
      withLegend: false
    }) as AccessDevice
    const conflict = cameras.some(c => Math.abs(c.x - newDevice.x) < 8 && Math.abs(c.y - newDevice.y) < 8)
    if (conflict) { newDevice.x += 24; newDevice.y += 24 }
    setAccessDevices([...accessDevices, newDevice])
    setSelectedAccessDevice(newDevice.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleAddVoceoDevice = (type: VoceoDevice['type'], modelId?: string, modelNameOverride?: string) => {
    const planForVoceo = activeView === 'voceo' ? (floorPlanVoceo ?? floorPlan) : floorPlan
    if (!planForVoceo) return
    const sequence = getNextVoceoSequence()
    const baseName =
      type === 'speaker' ? 'Bocina' :
        type === 'horn' ? 'Corneta' :
          'Panel de Voceo'
    const modelName = (modelNameOverride && modelNameOverride.trim().length > 0) ? modelNameOverride.trim() : baseName
    const resolvedType = (modelNameOverride || modelId)
      ? inferVoceoDeviceType({ marca: '', modelo: modelNameOverride || '', codigo: modelId || '', descripcion: modelNameOverride || '' })
      : type
    const newDevice: VoceoDevice = {
      id: crypto.randomUUID(),
      type: resolvedType,
      modelId,
      modelName,
      name: `${modelName} - ${sequence}`,
      labelVisible: true,
      x: 560,
      y: 340,
      rotation: 0,
      labelOffsetX: 0,
      labelOffsetY: -18,
      labelFontSize: 11,
      labelFontFamily: 'sans-serif',
      labelFontWeight: 'normal',
      labelFontStyle: 'normal',
      labelFontColor: '#1e293b'
    }
    // validation: avoid overlap with cámaras/acc
    const conflictCam = cameras.some(c => Math.abs(c.x - newDevice.x) < 8 && Math.abs(c.y - newDevice.y) < 8)
    const conflictAcc = accessDevices.some(d => Math.abs(d.x - newDevice.x) < 8 && Math.abs(d.y - newDevice.y) < 8)
    if (conflictCam || conflictAcc) { newDevice.x += 28; newDevice.y += 28 }
    setVoceoDevices([...voceoDevices, newDevice])
    setSelectedVoceoDevice(newDevice.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }
  const handleUpdateVoceoDevice = (id: string, updates: Partial<VoceoDevice>) => {
    setVoceoDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
  }
  const handleDeleteVoceoDevice = (id: string) => {
    setVoceoDevices((prev) => prev.filter((d) => d.id !== id))
    if (selectedVoceoDevice === id) setSelectedVoceoDevice(null)
  }

  const handleAddVoceoDeviceWithoutLegend = (type: VoceoDevice['type'], modelId?: string, modelNameOverride?: string) => {
    const planForVoceo = activeView === 'voceo' ? (floorPlanVoceo ?? floorPlan) : floorPlan
    if (!planForVoceo) return
    const resolvedType = (modelNameOverride || modelId)
      ? inferVoceoDeviceType({ marca: '', modelo: modelNameOverride || '', codigo: modelId || '', descripcion: modelNameOverride || '' })
      : type
    const newDevice: VoceoDevice = {
      id: crypto.randomUUID(),
      type: resolvedType,
      modelId,
      modelName: modelNameOverride,
      name: '',
      labelVisible: false,
      x: 560,
      y: 340,
      rotation: 0,
      labelOffsetX: 0,
      labelOffsetY: -18,
      labelFontSize: 11,
      labelFontFamily: 'sans-serif',
      labelFontWeight: 'normal',
      labelFontStyle: 'normal',
      labelFontColor: '#1e293b'
    }
    const conflictCam = cameras.some(c => Math.abs(c.x - newDevice.x) < 8 && Math.abs(c.y - newDevice.y) < 8)
    const conflictAcc = accessDevices.some(d => Math.abs(d.x - newDevice.x) < 8 && Math.abs(d.y - newDevice.y) < 8)
    if (conflictCam || conflictAcc) { newDevice.x += 28; newDevice.y += 28 }
    setVoceoDevices([...voceoDevices, newDevice])
    setSelectedVoceoDevice(newDevice.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleAddFireDevice = (type: FireDevice['type'], modelId?: string, modelNameOverride?: string) => {
    const planForFire = activeView === 'fire' ? (floorPlanFire ?? floorPlan) : floorPlan
    if (!planForFire) return
    const idx = fireDevices.length + 1
    const baseName =
      type === 'panel' ? 'Panel' :
        type === 'smoke_detector' ? 'Detector de Humo' :
          type === 'smoke_heat_detector' ? 'Detector Combinado' :
            type === 'heat_detector' ? 'Detector de Calor' :
              type === 'manual_station' ? 'Estación Manual' :
                type === 'explosion_proof_station' ? 'Estación Manual EX' :
                  type === 'horn_strobe' ? 'Notificador A/V' :
                    type === 'led_indicator' ? 'Indicador LED' :
                      type === 'module' ? 'Módulo' : 'Base'
    const modelName = (modelNameOverride && modelNameOverride.trim().length > 0) ? modelNameOverride.trim() : baseName
    const resolvedType = (modelNameOverride || modelId)
      ? inferFireDeviceType({ marca: '', modelo: modelNameOverride || '', codigo: modelId || '', descripcion: modelNameOverride || '' })
      : type
    const newDevice: FireDevice = {
      id: crypto.randomUUID(),
      type: resolvedType,
      modelId,
      modelName,
      name: `${modelName} - ${idx}`,
      x: 600,
      y: 360,
      rotation: 0,
      labelOffsetX: 0,
      labelOffsetY: -18,
      labelVisible: true,
      labelFontSize: 11,
      labelFontFamily: 'sans-serif',
      labelFontWeight: 'normal',
      labelFontStyle: 'normal',
      labelFontColor: '#1e293b'
    }
    const conflictCam = cameras.some(c => Math.abs(c.x - newDevice.x) < 8 && Math.abs(c.y - newDevice.y) < 8)
    const conflictAcc = accessDevices.some(d => Math.abs(d.x - newDevice.x) < 8 && Math.abs(d.y - newDevice.y) < 8)
    const conflictVo = voceoDevices.some(d => Math.abs(d.x - newDevice.x) < 8 && Math.abs(d.y - newDevice.y) < 8)
    if (conflictCam || conflictAcc || conflictVo) { newDevice.x += 28; newDevice.y += 28 }
    setFireDevices([...fireDevices, newDevice])
    setSelectedFireDevice(newDevice.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleAddFireDeviceWithoutLegend = (type: FireDevice['type'], modelId?: string, modelNameOverride?: string) => {
    const planForFire = activeView === 'fire' ? (floorPlanFire ?? floorPlan) : floorPlan
    if (!planForFire) return
    const resolvedType = (modelNameOverride || modelId)
      ? inferFireDeviceType({ marca: '', modelo: modelNameOverride || '', codigo: modelId || '', descripcion: modelNameOverride || '' })
      : type
    const newDevice: FireDevice = {
      id: crypto.randomUUID(),
      type: resolvedType,
      modelId,
      modelName: modelNameOverride,
      name: '',
      x: 600,
      y: 360,
      rotation: 0,
      labelOffsetX: 0,
      labelOffsetY: -18,
      labelVisible: false,
      labelFontSize: 11,
      labelFontFamily: 'sans-serif',
      labelFontWeight: 'normal',
      labelFontStyle: 'normal',
      labelFontColor: '#1e293b'
    }
    const conflictCam = cameras.some(c => Math.abs(c.x - newDevice.x) < 8 && Math.abs(c.y - newDevice.y) < 8)
    const conflictAcc = accessDevices.some(d => Math.abs(d.x - newDevice.x) < 8 && Math.abs(d.y - newDevice.y) < 8)
    const conflictVo = voceoDevices.some(d => Math.abs(d.x - newDevice.x) < 8 && Math.abs(d.y - newDevice.y) < 8)
    if (conflictCam || conflictAcc || conflictVo) { newDevice.x += 28; newDevice.y += 28 }
    setFireDevices([...fireDevices, newDevice])
    setSelectedFireDevice(newDevice.id)
    setPropertiesVisible(true)
    setPropertiesMinimized(false)
  }

  const handleUploadFloorPlan = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return

    // Limpiar todos los dispositivos y planos anteriores al cargar nuevo plano
    setCameras([])
    setAccessDevices([])
    setVoceoDevices([])
    setFireDevices([])
    setParkingDevices([])

    // Limpiar selecciones
    setSelectedCamera(null)
    setSelectedAccessDevice(null)
    setSelectedVoceoDevice(null)
    setSelectedFireDevice(null)
    setSelectedParkingDevice(null)

    // Limpiar todos los planos
    setFloorPlanAccess(null)
    setFloorPlanVoceo(null)
    setFloorPlanFire(null)
    setFloorPlanParking(null)

    // Limpiar estado de sembrado de parquímetros
    setParkingSeedModel(null)
    setParkingStatus('Selecciona Parquímetro para iniciar')
    setCameraSeedModel(null)
    setCameraStatus('Selecciona Cámara para iniciar')
    setAccessSeedModel(null)
    setAccessStatus('Selecciona Dispositivo de Acceso para iniciar')
    setVoceoSeedModel(null)
    setVoceoStatus('Selecciona Dispositivo de Voceo para iniciar')

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/') && (/\.(png|jpe?g)$/i.test(file.name))
    if (isPdf) {
      try {
        // @ts-ignore
        const pdfjsMod = await import('pdfjs-dist/build/pdf.min.js');
        const pdfjs = (pdfjsMod as any).default ?? (pdfjsMod as any);
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        const arrayBuf = await file.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: arrayBuf }).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: ctx, viewport }).promise
        const dataUrl = canvas.toDataURL('image/png')
        setFloorPlan({
          id: crypto.randomUUID(),
          name: file.name,
          url: dataUrl,
          width: viewport.width,
          height: viewport.height,
          scaleMetersPerPixel: undefined,
          locked: false
        })
        setShowScaleInstruction(true)
      } catch { }
      return
    }
    if (isImage) {
      try {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const img = new Image()
          img.onload = () => {
            setFloorPlan({
              id: crypto.randomUUID(),
              name: file.name,
              url: dataUrl,
              width: img.width,
              height: img.height,
              scaleMetersPerPixel: undefined,
              locked: false
            })
            setShowScaleInstruction(true)
          }
          img.onerror = () => { }
          img.src = dataUrl
        }
        reader.readAsDataURL(file)
      } catch { }
      return
    }
  }

  const handleExportProject = () => {
    const projectData = {
      floorPlan,
      floorPlanAccess,
      floorPlanVoceo,
      floorPlanFire,
      floorPlanParking,
      cameras,
      accessDevices,
      voceoDevices,
      fireDevices,
      parkingDevices,
      timestamp: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cctv-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveCamerasSeed = () => {
    const payload = { floorPlan, cameras, iconScales, savedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'camaras.seed.json'
    a.click()
  }
  const saveAccessSeed = () => {
    const payload = { floorPlan: floorPlanAccess ?? floorPlan, accessDevices, iconScales, savedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'acceso.seed.json'
    a.click()
  }
  const saveVoceoSeed = () => {
    const payload = { floorPlan: floorPlanVoceo ?? floorPlan, voceoDevices, iconScales, savedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'voceo.seed.json'
    a.click()
  }
  const saveFireSeed = () => {
    const payload = { floorPlan: floorPlanFire ?? floorPlan, fireDevices, iconScales, savedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'incendio.seed.json'
    a.click()
  }
  const saveParkingSeed = () => {
    const payload = { floorPlan: floorPlanParking ?? floorPlan, parkingDevices, iconScales, savedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'parquimetro.seed.json'
    a.click()
  }
  const openCamerasSeed = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (json.floorPlan) setFloorPlan(json.floorPlan)
        if (Array.isArray(json.cameras)) setCameras(json.cameras)
        if (json.iconScales) setIconScales(json.iconScales)
        setActiveView('cameras')
      } catch { }
    }
    reader.readAsText(file)
  }
  const openAccessSeed = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (json.floorPlan) setFloorPlanAccess(json.floorPlan)
        if (Array.isArray(json.accessDevices)) setAccessDevices(normalizeAccessDevices(json.accessDevices))
        if (json.iconScales) setIconScales(json.iconScales)
        setActiveView('access')
      } catch { }
    }
    reader.readAsText(file)
  }
  const openVoceoSeed = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (json.floorPlan) setFloorPlanVoceo(json.floorPlan)
        if (Array.isArray(json.voceoDevices)) setVoceoDevices(json.voceoDevices)
        if (json.iconScales) setIconScales(json.iconScales)
        setActiveView('voceo')
      } catch { }
    }
    reader.readAsText(file)
  }
  const openFireSeed = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (json.floorPlan) setFloorPlanFire(json.floorPlan)
        if (Array.isArray(json.fireDevices)) setFireDevices(json.fireDevices)
        if (json.iconScales) setIconScales(json.iconScales)
        setActiveView('fire')
      } catch { }
    }
    reader.readAsText(file)
  }
  const openParkingSeed = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (json.floorPlan) setFloorPlanParking(json.floorPlan)
        if (Array.isArray(json.parkingDevices)) setParkingDevices(json.parkingDevices)
        if (json.iconScales) setIconScales(json.iconScales)
        setActiveView('parking')
      } catch { }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_24px_70px_-42px_rgba(15,23,42,0.5)]">
      {navbarActionsHost && createPortal(
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" title="Proyecto" aria-label="Menú de proyecto">
                <FilePlus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Proyectos</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleNewProject}>
                Nuevo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenProjectClick}>
                Abrir…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveProjectClick}>
                Guardar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Recientes</DropdownMenuLabel>
              {recentProjects.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">No hay proyectos recientes</div>
              ) : (
                recentProjects.map(p => (
                  <DropdownMenuItem key={p.id} onClick={() => loadRecentProject(p)} className="cursor-pointer">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">v{p.version}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.lastModified).toLocaleDateString()} {new Date(p.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            id="project-upload"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleProjectFileSelect}
          />

          <Badge variant="outline" className="gap-1">
            <Layout className="h-3 w-3" />
            {cameras.length} Cámaras
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Network className="h-3 w-3" />
            {Math.round(cameras.reduce((acc, cam) => acc + cam.bitrate, 0))} Mbps
          </Badge>
          <Badge variant="outline" className="gap-1">
            <HardDrive className="h-3 w-3" />
            {Math.round(cameras.reduce((acc, cam) => {
              const storagePerDay = (cam.bitrate * 3600 * 24) / 8
              return acc + storagePerDay
            }, 0) / 1024)} GB/día
          </Badge>

          <Separator orientation="vertical" className="h-6 mx-1 hidden lg:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" title="Sembrados por separado" aria-label="Menú de sembrados">
                <FileJson className="h-4 w-4 mr-1" />
                Sembrados
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Guardar</DropdownMenuLabel>
              <DropdownMenuItem onClick={saveCamerasSeed}>Guardar Cámaras</DropdownMenuItem>
              <DropdownMenuItem onClick={saveAccessSeed}>Guardar Acceso</DropdownMenuItem>
              <DropdownMenuItem onClick={saveVoceoSeed}>Guardar Voceo</DropdownMenuItem>
              <DropdownMenuItem onClick={saveFireSeed}>Guardar Incendio</DropdownMenuItem>
              <DropdownMenuItem onClick={saveParkingSeed}>Guardar Parquímetro</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Abrir</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => document.getElementById('seed-cams-upload')?.click()}>Abrir Cámaras</DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('seed-access-upload')?.click()}>Abrir Acceso</DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('seed-voceo-upload')?.click()}>Abrir Voceo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('seed-fire-upload')?.click()}>Abrir Incendio</DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('seed-parking-upload')?.click()}>Abrir Parquímetro</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input id="seed-cams-upload" type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCamerasSeed(f); e.target.value = '' }} />
          <input id="seed-access-upload" type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openAccessSeed(f); e.target.value = '' }} />
          <input id="seed-voceo-upload" type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openVoceoSeed(f); e.target.value = '' }} />
          <input id="seed-fire-upload" type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFireSeed(f); e.target.value = '' }} />
          <input id="seed-parking-upload" type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openParkingSeed(f); e.target.value = '' }} />
        </>,
        navbarActionsHost
      )}

      {/* Main Content */}
      <main className="flex min-h-0 flex-1 flex-col px-5 py-5 transition-all duration-300 lg:px-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTabKey)} className="flex h-full min-h-0 flex-col">
          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="min-h-0">
              <CatalogSidebar
                selected={selectedCatalog}
                onSelect={setSelectedCatalog}
                activeWorkspaceTab={activeTab}
                onWorkspaceTabChange={setActiveTab}
              />
            </div>
            <div className="min-h-0 flex flex-1 flex-col">
              <TabsContent value="design" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <Card id="export-design-card" className="min-h-0 flex-1 overflow-hidden rounded-[28px] border-border/60 bg-card/92 py-0 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)]">
                  <CardHeader className="shrink-0 gap-4 border-b border-border/60 bg-muted/30 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">Diseño 2D</CardTitle>
                      <CardDescription className="mt-1">
                        {floorPlan ? floorPlan.name : 'Sin plano cargado'}
                      </CardDescription>
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
                      <div className="flex flex-col gap-2 rounded-md border px-2 py-2 sm:flex-row sm:items-center sm:py-1">
                        <span className="text-xs font-medium text-muted-foreground sm:shrink-0">Vista:</span>
                        <div className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:flex-wrap lg:flex-nowrap">
                          <Button className="w-full sm:w-auto" variant={activeView === 'cameras' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('cameras')}>Cámaras</Button>
                          <Button className="w-full sm:w-auto" variant={activeView === 'access' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('access')}>Control de Acceso</Button>
                          <Button className="w-full sm:w-auto" variant={activeView === 'voceo' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('voceo')}>Voceo</Button>
                          <Button className="w-full sm:w-auto" variant={activeView === 'fire' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('fire')}>Incendio</Button>
                          <Button className="w-full sm:w-auto" variant={activeView === 'parking' ? 'default' : 'outline'} size="sm" onClick={() => {
                            setActiveView('parking')
                            // Mantiene intactos los datos sembrados y solo reinicia el estado visual de la vista.
                            setSelectedCamera(null); setSelectedAccessDevice(null); setSelectedVoceoDevice(null); setSelectedFireDevice(null)
                            setSelectedParkingDevice(null); setParkingSeedModel(null)
                            setParkingStatus('Lienzo limpio. Selecciona un modelo en Catálogo de Sistema Parquímetro y haz clic en el plano para sembrar.')
                            setClearCanvasToken(t => t + 1)
                          }}>Parquímetro</Button>
                          <Button className="w-full sm:w-auto" variant={activeView === 'combined' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('combined')}>Combinada</Button>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full md:w-auto"
                        onClick={() => document.getElementById('floor-plan-upload')?.click()}
                        aria-label="Cargar plano"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Cargar Plano
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full md:w-auto"
                        onClick={() => setExportOpen(true)}
                        aria-label="Exportar PDF"
                      >
                        Exportar PDF
                      </Button>
                    </div>
                    <input
                      id="floor-plan-upload"
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadFloorPlan(file)
                      }}
                    />
                  </CardHeader>
                  <CardContent className="relative flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.10),transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.82))] p-0 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.25),transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.92))]">
                    <div className="flex h-full w-full overflow-hidden">
                    {/* Panel lateral izquierdo de Catálogo — reemplaza el overlay anterior */}
                    {selectedCatalog && !catalogClosing && (() => {
                      const CATALOG_META: Record<string, { title: string; Icon: React.ElementType }> = {
                        cameras: { title: 'Catálogo de Cámaras', Icon: Camera },
                        access:  { title: 'Catálogo de Control de Acceso', Icon: BadgeCheck },
                        voceo:   { title: 'Catálogo de Voceo', Icon: Megaphone },
                        fire:    { title: 'Catálogo de Incendio', Icon: Flame },
                        parking: { title: 'Catálogo de Sistema Parquímetro', Icon: Car },
                      }
                      const meta = CATALOG_META[selectedCatalog]
                      const CatalogIcon = meta?.Icon
                      return (
                        <aside className="h-full w-[320px] xl:w-[360px] shrink-0 border-r border-border/60 bg-card/95 backdrop-blur-md shadow-xl flex flex-col overflow-hidden z-20 animate-in slide-in-from-left duration-200">
                          {/* Header fijo */}
                          <div className="flex items-center justify-between border-b px-3 py-2.5 bg-muted/40 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              {CatalogIcon && <CatalogIcon className="h-4 w-4 text-primary shrink-0" />}
                              <span className="font-semibold text-xs truncate">{meta?.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                              title="Cerrar catálogo (Esc)"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {/* Cuerpo scrollable */}
                          <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            {selectedCatalog === 'cameras' && (
                              <CameraCatalog
                                onAddCamera={(t, modelId, modelName) => { handleAddCamera(t, modelId, modelName); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onAddCameraWithoutLegend={(t, modelId, modelName) => { handleAddCameraWithoutLegend(t, modelId, modelName); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onPickModel={(model) => {
                                  setCameraSeedModel(model)
                                  setCatalogClosing(true)
                                  setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200)
                                  setCameraStatus(`Modelo seleccionado: ${model.modelo}. Haga clic en el plano para sembrar.`)
                                }}
                                detailed={true}
                                disabled={false}
                                compact={true}
                              />
                            )}
                            {selectedCatalog === 'access' && (
                              <AccessControlCatalog
                                onAddDevice={(type, modelId, modelName, iconKey) => { handleAddAccessDevice(type, modelId, modelName, iconKey); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onAddDeviceWithoutLegend={(type, modelId, modelName, iconKey) => { handleAddAccessDeviceWithoutLegend(type, modelId, modelName, iconKey); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onPickModel={(model) => {
                                  setAccessSeedModel(model)
                                  setCatalogClosing(true)
                                  setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200)
                                  setAccessStatus(`Modelo seleccionado: ${model.modelo}. Haga clic en el plano para sembrar.`)
                                }}
                                disabled={false}
                                compact={true}
                              />
                            )}
                            {selectedCatalog === 'voceo' && (
                              <VoceoCatalog
                                onAddDevice={(type, modelId, modelName) => { handleAddVoceoDevice(type, modelId, modelName); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onAddDeviceWithoutLegend={(type, modelId, modelName) => { handleAddVoceoDeviceWithoutLegend(type, modelId, modelName); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onPickModel={(model) => {
                                  setVoceoSeedModel(model)
                                  setCatalogClosing(true)
                                  setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200)
                                  setVoceoStatus(`Modelo seleccionado: ${model.modelo}. Haga clic en el plano para sembrar.`)
                                }}
                                disabled={false}
                                compact={true}
                              />
                            )}
                            {selectedCatalog === 'fire' && (
                              <FireDetectionCatalog
                                onAddDevice={(type, modelId) => { handleAddFireDevice(type, modelId); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onAddDeviceWithoutLegend={(type, modelId) => { handleAddFireDeviceWithoutLegend(type, modelId); setCatalogClosing(true); setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200) }}
                                onPickModel={(model) => {
                                  setFireSeedModel(model)
                                  setCatalogClosing(true)
                                  setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200)
                                  setFireStatus(`Modelo seleccionado: ${model.modelo}. Haga clic en el plano para sembrar.`)
                                }}
                                disabled={false}
                                compact={true}
                              />
                            )}
                            {selectedCatalog === 'parking' && (
                              <ParkingCatalog
                                disabled={false}
                                onPickModel={(model) => {
                                  setParkingSeedModel(model)
                                  setCatalogClosing(true)
                                  setTimeout(() => { setSelectedCatalog(null); setCatalogClosing(false) }, 200)
                                  setParkingStatus(`Modelo seleccionado: ${model.modelo}. Haga clic en el plano para sembrar.`)
                                }}
                                compact={true}
                              />
                            )}
                          </div>
                        </aside>
                      )
                    })()}
                      {/* Lienzo Canvas (área autorregulable) */}
                      <div className="relative flex-1 min-w-0 h-full overflow-hidden">
                        <CCTVCanvas
                          cameras={cameras}
                          accessDevices={accessDevices}
                          voceoDevices={voceoDevices}
                          fireDevices={fireDevices}
                          parkingDevices={parkingDevices}
                          floorPlan={
                            activeView === 'access'
                              ? (floorPlanAccess ?? floorPlan)
                              : activeView === 'voceo'
                                ? (floorPlanVoceo ?? floorPlan)
                                : activeView === 'fire'
                                  ? (floorPlanFire ?? floorPlan)
                                  : activeView === 'parking'
                                    ? (floorPlanParking ?? floorPlan)
                                    : floorPlan
                          }
                          view={activeView}
                          selectedCamera={selectedCamera}
                          selectedAccessDevice={selectedAccessDevice}
                          selectedVoceoDevice={selectedVoceoDevice}
                          selectedFireDevice={selectedFireDevice}
                          selectedParkingDevice={selectedParkingDevice}
                          onCameraSelect={(id) => {
                            setSelectedCamera(id)
                            if (id) {
                              setPropertiesVisible(true)
                              setPropertiesMinimized(false)
                            } else if (!selectedAccessDevice && !selectedVoceoDevice && !selectedFireDevice && !selectedParkingDevice) {
                              setPropertiesVisible(false)
                            }
                          }}
                          onAccessDeviceSelect={(id) => {
                            setSelectedAccessDevice(id)
                            if (id) {
                              setPropertiesVisible(true)
                              setPropertiesMinimized(false)
                            } else if (!selectedCamera && !selectedVoceoDevice && !selectedFireDevice && !selectedParkingDevice) {
                              setPropertiesVisible(false)
                            }
                          }}
                          onVoceoDeviceSelect={(id) => {
                            setSelectedVoceoDevice(id)
                            if (id) {
                              setPropertiesVisible(true)
                              setPropertiesMinimized(false)
                            } else if (!selectedCamera && !selectedAccessDevice && !selectedFireDevice && !selectedParkingDevice) {
                              setPropertiesVisible(false)
                            }
                          }}
                          onFireDeviceSelect={(id) => {
                            setSelectedFireDevice(id)
                            if (id) {
                              setPropertiesVisible(true)
                              setPropertiesMinimized(false)
                            } else if (!selectedCamera && !selectedAccessDevice && !selectedVoceoDevice && !selectedParkingDevice) {
                              setPropertiesVisible(false)
                            }
                          }}
                          onParkingDeviceSelect={(id) => {
                            setSelectedParkingDevice(id)
                            if (id) {
                              setPropertiesVisible(true)
                              setPropertiesMinimized(false)
                            } else if (!selectedCamera && !selectedAccessDevice && !selectedVoceoDevice && !selectedFireDevice) {
                              setPropertiesVisible(false)
                            }
                          }}
                          onCameraUpdate={handleUpdateCamera}
                          onCameraDelete={handleDeleteCamera}
                          annotations={annotations}
                          onAnnotationsChange={setAnnotations}
                          hideFovLines={hideFovLines}
                          flashId={flashDeviceId}
                          onAccessDeviceUpdate={handleUpdateAccessDevice}
                          onAccessDeviceDelete={handleDeleteAccessDevice}
                          onVoceoDeviceUpdate={handleUpdateVoceoDevice}
                          onVoceoDeviceDelete={handleDeleteVoceoDevice}
                          onFireDeviceUpdate={(id, updates) => {
                            setFireDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
                          }}
                          onFireDeviceDelete={(id) => {
                            setFireDevices((prev) => prev.filter((d) => d.id !== id))
                            if (selectedFireDevice === id) setSelectedFireDevice(null)
                          }}
                          onParkingDeviceUpdate={(id, updates) => {
                            setParkingDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
                          }}
                          onParkingDeviceDelete={(id) => {
                            setParkingDevices((prev) => prev.filter((d) => d.id !== id))
                            if (selectedParkingDevice === id) setSelectedParkingDevice(null)
                          }}
                          onParkingDeviceCreate={(dev) => {
                            const seqUsed = new Set<number>()
                            parkingDevices.forEach(p => { if (p.sequence) seqUsed.add(p.sequence) })
                            let seq = 1
                            while (seqUsed.has(seq)) seq += 1

                            let type: ParkingDevice['type'] = 'generic'
                            if (parkingSeedModel) {
                              const mod = parkingSeedModel.modelo.toUpperCase()
                              const desc = parkingSeedModel.descripcion?.toUpperCase() || ''
                              if (mod.includes('CMP200L') || desc.includes('IZQUIERDA')) type = 'barrier_left'
                              else if (mod.includes('CMP200R') || desc.includes('DERECHA')) type = 'barrier_right'
                              else if (mod.includes('CMP') || desc.includes('BARRERA')) type = 'barrier'
                              else if (mod.includes('UHF5') || desc.includes('LECTOR')) type = 'uhf_reader'
                              else if (mod.includes('TAG')) type = 'tag'
                              else if (mod.includes('LM6') || desc.includes('LAZO') || desc.includes('MAGNÉTICO') || desc.includes('MAGNETICO')) type = 'magnetic_loop'
                              else type = 'parking_meter'
                            }

                            const base = parkingSeedModel?.modelo ?? 'Parquímetro'
                            const name = `${base} - ${seq}`
                            const uniqueId = crypto.randomUUID()
                            setParkingDevices([...parkingDevices, { ...dev, id: uniqueId, name, type, sequence: seq, labelVisible: true, labelFontSize: 10, labelFontFamily: 'sans-serif', labelFontWeight: 'normal', labelFontStyle: 'normal', labelFontColor: '#1e293b' }])
                            setSelectedParkingDevice(uniqueId)
                            setParkingStatus('Sembrado: haga clic para colocar más o presione Esc / Clic Derecho / Doble Clic para salir.')
                            setPropertiesVisible(true)
                            setPropertiesMinimized(false)
                          }}
                          onFireDeviceSeedCreate={(dev) => {
                            const idx = fireDevices.length + 1
                            const model = fireSeedModel
                            const type: FireDevice['type'] = model ? inferFireDeviceType(model) : 'panel'
                            const base = model?.modelo ?? 'Panel de Incendio'
                            const name = `${base} - ${idx}`
                            const uniqueId = crypto.randomUUID()
                            setFireDevices([...fireDevices, {
                              ...dev,
                              id: uniqueId,
                              modelId: model?.id ?? model?.codigo,
                              modelName: model?.modelo,
                              name,
                              type,
                              labelVisible: true,
                              labelFontSize: 11,
                              labelFontFamily: 'sans-serif',
                              labelFontWeight: 'normal',
                              labelFontStyle: 'normal'
                            }])
                            setSelectedFireDevice(uniqueId)
                            setFireStatus('Sembrado: haga clic para colocar más o presione Esc / Clic Derecho / Doble Clic para salir.')
                            setPropertiesVisible(true)
                            setPropertiesMinimized(false)
                          }}
                          onCameraSeedCreate={(dev) => {
                            // Inferir tipo de cámara a partir del modelo seleccionado
                            const model = cameraSeedModel
                            let resolvedType: Camera['type'] = 'dome'
                            if (model) {
                              const vMatch = VIVOTEK_CAMERAS.find(v => v.model.toLowerCase() === (model.modelo || '').toLowerCase() || v.id.toLowerCase() === (model.modelo || '').toLowerCase());
                              if (vMatch) {
                                resolvedType = vMatch.type as Camera['type']
                              } else {
                                const mod = (model.modelo || '').toUpperCase()
                                if (mod.startsWith('IB') || mod.startsWith('IT')) resolvedType = 'bullet'
                                else if (mod.startsWith('FE')) resolvedType = 'fisheye'
                                else if (mod.startsWith('SD')) resolvedType = 'ptz'
                                else if (mod.startsWith('CC') || mod.startsWith('MS')) resolvedType = 'panoramic'
                              }
                            }
                            const sequence = getNextCameraSequence()
                            const modelName = model?.modelo ?? resolveCameraModelName(resolvedType, model?.id)
                            const newCamera: Camera = {
                              id: crypto.randomUUID(),
                              type: resolvedType,
                              name: `${modelName} - ${sequence}`,
                              modelId: model?.id,
                              modelName,
                              sequence,
                              x: dev.x,
                              y: dev.y,
                              rotation: dev.rotation,
                              fov: resolvedType === 'fisheye' ? 360 : resolvedType === 'panoramic' ? 180 : resolvedType === 'ptz' ? 60 : 90,
                              resolution: '1920x1080',
                              bitrate: 4,
                              fps: 30,
                              labelOffsetX: dev.labelOffsetX ?? 0,
                              labelOffsetY: dev.labelOffsetY ?? -20,
                              labelVisible: true,
                              labelFontSize: 10,
                              labelFontFamily: 'Arial',
                              labelFontWeight: 'normal',
                              labelFontStyle: 'normal',
                              labelFontColor: '#1e293b',
                              distanceToObject: 15,
                              customRadiusMeters: 15,
                              installationHeight: 4,
                              objectHeight: 2,
                              cdvWidth: 27.22,
                              viewAngle1: 95,
                              viewAngle2: 69,
                              coverageOpacity: 0.5
                            }
                            setCameras([...cameras, newCamera])
                            setSelectedCamera(newCamera.id)
                            setCameraStatus('Sembrado: haga clic para colocar más o presione Esc / Clic Derecho / Doble Clic para salir.')
                            setPropertiesVisible(true)
                            setPropertiesMinimized(false)
                          }}
                          onAccessSeedCreate={(dev) => {
                            // Inferir tipo de access desde el modelo seleccionado
                            const model = accessSeedModel
                            const resolvedType: AccessDevice['type'] = model ? inferAccessDeviceType(model) : 'terminal'
                            const resolvedIconKey = inferAccessIconKey(model ?? { marca: '', modelo: 'Terminal', codigo: '', descripcion: '' } as any, resolvedType)
                            const newDevice = createSeededAccessDevice({
                              type: resolvedType,
                              idx: accessDevices.length + 1,
                              modelId: model?.id,
                              modelName: model?.modelo,
                              iconKey: resolvedIconKey,
                              withLegend: true
                            }) as AccessDevice
                            // Sobrescribir coordenadas con las del sembrado (clic en plano)
                            newDevice.id = crypto.randomUUID()
                            newDevice.x = dev.x
                            newDevice.y = dev.y
                            newDevice.rotation = dev.rotation
                            newDevice.labelOffsetX = dev.labelOffsetX ?? 0
                            newDevice.labelOffsetY = dev.labelOffsetY ?? -18
                            newDevice.labelFontSize = 11
                            setAccessDevices([...accessDevices, newDevice])
                            setSelectedAccessDevice(newDevice.id)
                            setAccessStatus('Sembrado: haga clic para colocar más o presione Esc / Clic Derecho / Doble Clic para salir.')
                            setPropertiesVisible(true)
                            setPropertiesMinimized(false)
                          }}
                          onVoceoSeedCreate={(dev) => {
                            // Inferir tipo de voceo desde el modelo seleccionado usando el clasificador del dominio
                            const model = voceoSeedModel
                            const resolvedType: VoceoDevice['type'] = model ? inferVoceoDeviceType(model) : 'speaker_ceiling'
                            const sequence = getNextVoceoSequence()
                            const modelName = (model?.modelo && model.modelo.trim().length > 0) ? model.modelo.trim() : 'Dispositivo'
                            const newDevice: VoceoDevice = {
                              id: crypto.randomUUID(),
                              type: resolvedType,
                              modelId: model?.id ?? model?.codigo,
                              modelName: modelName,
                              name: `${modelName} - ${sequence}`,
                              x: dev.x,
                              y: dev.y,
                              rotation: dev.rotation,
                              labelOffsetX: dev.labelOffsetX ?? 0,
                              labelOffsetY: dev.labelOffsetY ?? -18,
                              labelVisible: true,
                              labelFontSize: 11,
                              labelFontFamily: 'sans-serif',
                              labelFontWeight: 'normal',
                              labelFontStyle: 'normal',
                              labelFontColor: '#1e293b'
                            }
                            setVoceoDevices([...voceoDevices, newDevice])
                            setSelectedVoceoDevice(newDevice.id)
                            setVoceoStatus('Sembrado: haga clic para colocar más o presione Esc / Clic Derecho / Doble Clic para salir.')
                            setPropertiesVisible(true)
                            setPropertiesMinimized(false)
                          }}
                          parkingSeedName={parkingSeedModel?.modelo}
                          fireSeedName={fireSeedModel?.modelo}
                          cameraSeedName={cameraSeedModel?.modelo ?? cameraSeedModel?.name ?? cameraSeedModel?.title}
                          accessSeedName={accessSeedModel?.modelo ?? accessSeedModel?.name ?? accessSeedModel?.title}
                          voceoSeedName={voceoSeedModel?.modelo ?? voceoSeedModel?.name ?? voceoSeedModel?.title}
                          clearToken={clearCanvasToken}
                          onCancelSeeding={() => {
                            setParkingSeedModel(null)
                            setParkingStatus('Selecciona Parquímetro para iniciar')
                            setFireSeedModel(null)
                            setFireStatus('Selecciona Dispositivo de Incendio para iniciar')
                            setCameraSeedModel(null)
                            setCameraStatus('Selecciona Cámara para iniciar')
                            setAccessSeedModel(null)
                            setAccessStatus('Selecciona Dispositivo de Acceso para iniciar')
                            setVoceoSeedModel(null)
                            setVoceoStatus('Selecciona Dispositivo de Voceo para iniciar')
                          }}
                          iconScales={iconScales}
                          onIconScaleChange={(id, value) => {
                            setIconScales(prev => ({ ...prev, [id]: value }))
                          }}
                          defineScaleMode={defineScaleMode}
                          onScalePointsSelected={(ax, ay, bx, by, pixelDistance) => {
                            scaleSelectionRef.current = { ax, ay, bx, by, pixelDistance }
                            setDefineScaleMode(false)
                            setScaleInputOpen(true)
                          }}
                          onCameraCreate={(cam) => {
                            setCameras(prev => [...prev, cam])
                            setSelectedCamera(cam.id)
                          }}
                          onAccessDeviceCreate={(dev) => {
                            const normalized = normalizeAccessDevices([dev])[0]
                            setAccessDevices(prev => [...prev, normalized])
                            setSelectedAccessDevice(dev.id)
                          }}
                          onVoceoDeviceCreate={(dev) => {
                            setVoceoDevices(prev => [...prev, dev])
                            setSelectedVoceoDevice(dev.id)
                          }}
                          onFireDeviceCreate={(dev) => {
                            setFireDevices(prev => [...prev, dev])
                            setSelectedFireDevice(dev.id)
                          }}
                        />
                        {activeView === 'parking' && (
                          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                            <div className="text-xs bg-card/90 border rounded px-2 py-1 shadow-sm">
                              {parkingStatus}
                            </div>
                            {parkingSeedModel && (
                              <Button variant="secondary" size="sm" onClick={() => {
                                setParkingSeedModel(null)
                                setParkingStatus('Selecciona Parquímetro para iniciar')
                              }} className="h-6 text-[10px] shadow-sm">
                                Cancelar (Esc)
                              </Button>
                            )}
                          </div>
                        )}
                        {activeView === 'fire' && (
                          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                            <div className="text-xs bg-card/90 border rounded px-2 py-1 shadow-sm">
                              {fireStatus}
                            </div>
                            {fireSeedModel && (
                              <Button variant="secondary" size="sm" onClick={() => {
                                setFireSeedModel(null)
                                setFireStatus('Selecciona Dispositivo de Incendio para iniciar')
                              }} className="h-6 text-[10px] shadow-sm">
                                Cancelar (Esc)
                              </Button>
                            )}
                          </div>
                        )}
                        {activeView === 'cameras' && (cameraSeedModel || cameraStatus) && (
                          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                            <div className="text-xs bg-card/90 border rounded px-2 py-1 shadow-sm">
                              {cameraStatus}
                            </div>
                            {cameraSeedModel && (
                              <Button variant="secondary" size="sm" onClick={() => {
                                setCameraSeedModel(null)
                                setCameraStatus('Selecciona Cámara para iniciar')
                              }} className="h-6 text-[10px] shadow-sm">
                                Cancelar (Esc)
                              </Button>
                            )}
                          </div>
                        )}
                        {activeView === 'access' && (accessSeedModel || accessStatus) && (
                          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                            <div className="text-xs bg-card/90 border rounded px-2 py-1 shadow-sm">
                              {accessStatus}
                            </div>
                            {accessSeedModel && (
                              <Button variant="secondary" size="sm" onClick={() => {
                                setAccessSeedModel(null)
                                setAccessStatus('Selecciona Dispositivo de Acceso para iniciar')
                              }} className="h-6 text-[10px] shadow-sm">
                                Cancelar (Esc)
                              </Button>
                            )}
                          </div>
                        )}
                        {activeView === 'voceo' && (voceoSeedModel || voceoStatus) && (
                          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                            <div className="text-xs bg-card/90 border rounded px-2 py-1 shadow-sm">
                              {voceoStatus}
                            </div>
                            {voceoSeedModel && (
                              <Button variant="secondary" size="sm" onClick={() => {
                                setVoceoSeedModel(null)
                                setVoceoStatus('Selecciona Dispositivo de Voceo para iniciar')
                              }} className="h-6 text-[10px] shadow-sm">
                                Cancelar (Esc)
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Botón con flecha para volver a expandir el panel cuando está plegado/minimizado */}
                        {(selectedCamera || selectedAccessDevice || selectedVoceoDevice || selectedFireDevice || selectedParkingDevice) && (propertiesMinimized || !propertiesVisible) && (
                          <Button
                            className="absolute top-4 right-4 z-30 shadow-md bg-card/90 hover:bg-card border backdrop-blur-sm gap-1.5 text-xs px-2.5 py-1.5 animate-in fade-in duration-200"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPropertiesVisible(true)
                              setPropertiesMinimized(false)
                            }}
                            title="Mostrar Panel de Propiedades"
                          >
                            <ChevronLeft className="h-4 w-4 text-primary" />
                            <span>Propiedades</span>
                          </Button>
                        )}
                      </div>

                      {/* Panel de Propiedades acoplado a la derecha */}
                      {propertiesVisible && !propertiesMinimized && (selectedCamera || selectedAccessDevice || selectedVoceoDevice || selectedFireDevice || selectedParkingDevice) && (
                        <aside className="h-full w-80 lg:w-[350px] shrink-0 border-l border-border/60 bg-card/95 backdrop-blur-md shadow-xl flex flex-col overflow-hidden z-20 animate-in slide-in-from-right duration-200">
                          <PropertiesPanel
                            cameras={cameras}
                            accessDevices={accessDevices}
                            voceoDevices={voceoDevices}
                            fireDevices={fireDevices}
                            parkingDevices={parkingDevices}
                            selectedCamera={selectedCamera}
                            selectedAccessDevice={selectedAccessDevice}
                            selectedVoceoDevice={selectedVoceoDevice}
                            selectedFireDevice={selectedFireDevice}
                            selectedParkingDevice={selectedParkingDevice}
                            onClose={() => {
                              setSelectedCamera(null)
                              setSelectedAccessDevice(null)
                              setSelectedVoceoDevice(null)
                              setSelectedFireDevice(null)
                              setSelectedParkingDevice(null)
                              setPropertiesVisible(false)
                            }}
                            onCameraUpdate={handleUpdateCamera}
                            onCameraDelete={handleDeleteCamera}
                            onAccessDeviceUpdate={handleUpdateAccessDevice}
                            onAccessDeviceDelete={handleDeleteAccessDevice}
                            onVoceoDeviceUpdate={handleUpdateVoceoDevice}
                            onVoceoDeviceDelete={handleDeleteVoceoDevice}
                            onFireDeviceUpdate={(id, updates) => {
                              setFireDevices(fireDevices.map(d => d.id === id ? { ...d, ...updates } : d))
                            }}
                            onFireDeviceDelete={(id) => {
                              setFireDevices(fireDevices.filter(d => d.id !== id))
                              if (selectedFireDevice === id) setSelectedFireDevice(null)
                            }}
                            onParkingDeviceUpdate={(id, updates) => {
                              setParkingDevices(parkingDevices.map(d => d.id === id ? { ...d, ...updates } : d))
                            }}
                            onParkingDeviceDelete={(id) => {
                              setParkingDevices(parkingDevices.filter(d => d.id !== id))
                              if (selectedParkingDevice === id) setSelectedParkingDevice(null)
                            }}
                            minimized={propertiesMinimized}
                            onMinimizedChange={setPropertiesMinimized}
                            opacity={propertiesOpacity}
                            onOpacityChange={setPropertiesOpacity}
                            hideFovLines={hideFovLines}
                            onHideFovLinesChange={handleHideFovLinesChange}
                            onTriggerFlash={handleTriggerFlash}
                            onRecordModelChange={handleRecordModelChange}
                            onUndoModelChange={handleUndoCameraModelChange}
                            undoCount={cameraUndoCount}
                          />
                        </aside>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calculations" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                <div id="export-calculations-card" className="h-full overflow-auto rounded-[28px] border border-border/60 bg-card/92 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)] md:p-6">
                  <CalculationsPanel cameras={cameras} floorPlan={floorPlan} />
                </div>
              </TabsContent>

              <TabsContent value="assistant" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                <div className="h-full overflow-auto rounded-[28px] border border-border/60 bg-card/92 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)] md:p-6">
                  <AssistantPanel cameras={cameras} floorPlan={floorPlan} />
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>

      <AlertDialog open={showScaleInstruction} onOpenChange={setShowScaleInstruction}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Definir escala del plano</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor seleccione dos puntos en la imagen de fondo para definir la escala.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => { setShowScaleInstruction(false); setDefineScaleMode(true) }}>
            OK
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <ExportToPDFDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        projectSnapshot={{
          floorPlan,
          floorPlanAccess,
          floorPlanVoceo,
          floorPlanFire,
          floorPlanParking,
          cameras,
          accessDevices,
          voceoDevices,
          fireDevices,
          parkingDevices,
          iconScales,
          annotations,
          hideFovLines,
        }}
      />
      <Dialog open={onboardingOpen} onOpenChange={(v) => { setOnboardingOpen(v); if (!v && dontShowOnboardingAgain) { try { localStorage.setItem('cctv-onboarding-shown', '1') } catch { } } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atajos rápidos</DialogTitle>
            <DialogDescription>
              Conoce las acciones esenciales para trabajar más rápido en el lienzo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Shift + arrastrar</span>
              <span className="text-muted-foreground">Rotar seleccionado</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ctrl + C / Ctrl + V</span>
              <span className="text-muted-foreground">Copiar / Pegar dispositivo</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Clic derecho sobre elemento</span>
              <span className="text-muted-foreground">Menú contextual copiar/pegar</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Rueda del mouse</span>
              <span className="text-muted-foreground">Zoom</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Escape</span>
              <span className="text-muted-foreground">Cancelar medición</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Barra inferior</span>
              <span className="text-muted-foreground">Pan, Medir, Zoom, Reset</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Checkbox checked={dontShowOnboardingAgain} onCheckedChange={(v) => setDontShowOnboardingAgain(!!v)} />
              <span>No volver a mostrar</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setOnboardingOpen(false); if (dontShowOnboardingAgain) { try { localStorage.setItem('cctv-onboarding-shown', '1') } catch { } } }}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scaleInputOpen} onOpenChange={setScaleInputOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Introducir distancia real</DialogTitle>
            <DialogDescription>
              Por favor, introduzca la distancia real entre esos dos puntos (m)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Ejemplo: 14.0"
              value={realDistance}
              onChange={(e) => setRealDistance(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Checkbox checked={blockBackground} onCheckedChange={(v) => setBlockBackground(!!v)} />
              <span>bloquear fondo</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScaleInputOpen(false)
                setRealDistance('')
                setBlockBackground(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const val = Number(realDistance)
                const sel = scaleSelectionRef.current
                if (!sel || !isFinite(sel.pixelDistance) || sel.pixelDistance <= 0) return
                if (!isFinite(val) || val <= 0) return
                if (!floorPlan) return
                const mPerPx = val / sel.pixelDistance
                setFloorPlan({
                  ...floorPlan,
                  scaleMetersPerPixel: mPerPx,
                  locked: blockBackground,
                  scalePoints: { ax: sel.ax, ay: sel.ay, bx: sel.bx, by: sel.by }
                })
                setScaleInputOpen(false)
                setRealDistance('')
                setBlockBackground(false)
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Confirmation Dialog */}
      <AlertDialog open={confirmNewProjectOpen} onOpenChange={setConfirmNewProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea limpiar el lienzo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán todos los cambios no guardados. Esta acción eliminará el plano actual y todas las cámaras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeNewProject} className="bg-destructive hover:bg-destructive/90">
              Limpiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Project Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar Proyecto</DialogTitle>
            <DialogDescription>
              Ingrese los detalles del proyecto para guardarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                className="col-span-3"
                placeholder="Mi Proyecto CCTV"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descripción
              </Label>
              <Input
                id="description"
                value={projectDescInput}
                onChange={(e) => setProjectDescInput(e.target.value)}
                className="col-span-3"
                placeholder="Descripción opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={executeSaveProject} disabled={!projectNameInput.trim()}>
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Success Confirmation */}
      <AlertDialog open={!!projectSaveSuccess} onOpenChange={() => setProjectSaveSuccess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              Proyecto Guardado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Proyecto '{projectSaveSuccess?.name}' guardado correctamente en {projectSaveSuccess?.path}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setProjectSaveSuccess(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const DISTANCIA_OBJETO_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 250, 300]
const ALTURA_INSTALACION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40]
const ALTURA_OBJETO_OPTIONS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20]
const ANCHO_CDV_OPTIONS = [7.7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 27.22]
const ANGULOS_VISION_OPTIONS = [29, 30, 34, 39, 40, 44, 49, 50, 54, 59, 60, 64, 65, 69, 70, 74, 79, 80, 84, 88, 89, 90, 95, 109, 180, 360]

function CameraTypeSymbol({ type }: { type?: PlannerCamera['type'] }) {
  switch (type) {
    case 'bullet':
      return <Video className="h-4 w-4 shrink-0" />
    case 'fisheye':
      return <Eye className="h-4 w-4 shrink-0" />
    case 'ptz':
      return <Disc className="h-4 w-4 shrink-0" />
    case 'panoramic':
      return <Layout className="h-4 w-4 shrink-0" />
    default:
      return <Camera className="h-4 w-4 shrink-0" />
  }
}

function inferCameraPropsFromModel(modelItem: any): Partial<PlannerCamera> {
  const modelName = modelItem.model || modelItem.modelo || 'Cámara'
  const modelId = modelItem.id || modelItem.codigo || modelName.toLowerCase()

  let type: PlannerCamera['type'] = modelItem.type || 'dome'
  if (!modelItem.type) {
    const mod = (modelName || '').toUpperCase()
    if (mod.startsWith('IB') || mod.startsWith('IT') || mod.includes('BULLET')) type = 'bullet'
    else if (mod.startsWith('FE') || mod.startsWith('SC') || mod.includes('FISHEYE')) type = 'fisheye'
    else if (mod.startsWith('SD') || mod.includes('PTZ') || mod.includes('SPEED DOME')) type = 'ptz'
    else if (mod.startsWith('CC') || mod.startsWith('MS') || mod.includes('PANORAMIC')) type = 'panoramic'
    else type = 'dome'
  }

  let fov = typeof modelItem.fov === 'number' ? modelItem.fov : undefined
  if (!fov) {
    if (type === 'fisheye') fov = 360
    else if (type === 'panoramic') fov = 180
    else if (type === 'ptz') fov = 60
    else fov = 90
  }

  let focalLength: number | undefined = undefined
  if (typeof modelItem.focalLength === 'string') {
    const parsed = parseFloat(modelItem.focalLength)
    if (!isNaN(parsed) && parsed > 0) focalLength = parsed
  }
  if (!focalLength) {
    if (type === 'fisheye') focalLength = 1.6
    else if (type === 'panoramic') focalLength = 1.45
    else if (type === 'ptz') focalLength = 4.3
    else focalLength = 2.8
  }

  let resolution = '1920x1080'
  const resStr = (modelItem.resolution || '').toUpperCase()
  if (resStr.includes('12MP')) resolution = '4000x3000'
  else if (resStr.includes('20MP')) resolution = '5184x3888'
  else if (resStr.includes('8MP') || resStr.includes('4K')) resolution = '3840x2160'
  else if (resStr.includes('6MP')) resolution = '3072x2048'
  else if (resStr.includes('5MP')) resolution = '2560x1920'
  else if (resStr.includes('4MP')) resolution = '2560x1440'
  else if (resStr.includes('3MP')) resolution = '2048x1536'
  else if (resStr.includes('2MP') || resStr.includes('1080P')) resolution = '1920x1080'

  return {
    modelId,
    modelName,
    type,
    fov,
    focalLength,
    resolution,
    coverageShape: 'auto',
  }
}

function PropertiesPanel(props: {
  cameras: PlannerCamera[]
  accessDevices: AccessDevice[]
  voceoDevices: VoceoDevice[]
  fireDevices: FireDevice[]
  parkingDevices: ParkingDevice[]
  selectedCamera: string | null
  selectedAccessDevice: string | null
  selectedVoceoDevice: string | null
  selectedFireDevice: string | null
  selectedParkingDevice: string | null
  onClose: () => void
  onCameraUpdate: (id: string, updates: Partial<PlannerCamera>) => void
  onCameraDelete: (id: string) => void
  onAccessDeviceUpdate: (id: string, updates: Partial<AccessDevice>) => void
  onAccessDeviceDelete: (id: string) => void
  onVoceoDeviceUpdate: (id: string, updates: Partial<VoceoDevice>) => void
  onVoceoDeviceDelete: (id: string) => void
  onFireDeviceUpdate: (id: string, updates: Partial<FireDevice>) => void
  onFireDeviceDelete: (id: string) => void
  onParkingDeviceUpdate: (id: string, updates: Partial<ParkingDevice>) => void
  onParkingDeviceDelete: (id: string) => void
  className?: string
  minimized: boolean
  onMinimizedChange: (v: boolean) => void
  opacity: number
  onOpacityChange: (v: number) => void
  hideFovLines: boolean
  onHideFovLinesChange: (v: boolean) => void
  onTriggerFlash?: (id: string) => void
  onRecordModelChange?: (entry: CameraModelUndoEntry) => void
  onUndoModelChange?: () => void
  undoCount?: number
}) {
  const { cameras, accessDevices, voceoDevices, fireDevices, parkingDevices, selectedCamera, selectedAccessDevice, selectedVoceoDevice, selectedFireDevice, selectedParkingDevice, onClose, onCameraUpdate, onCameraDelete, onAccessDeviceUpdate, onAccessDeviceDelete, onVoceoDeviceUpdate, onVoceoDeviceDelete, onFireDeviceUpdate, onFireDeviceDelete, onParkingDeviceUpdate, onParkingDeviceDelete, className, minimized, onMinimizedChange, opacity, onOpacityChange, hideFovLines, onHideFovLinesChange, onTriggerFlash, onRecordModelChange, onUndoModelChange, undoCount } = props
  const { toast } = useToast()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [isModelAnimating, setIsModelAnimating] = useState<boolean>(false)

  const selectedCameraData = cameras.find(c => c.id === selectedCamera) || null
  const selectedDeviceData = accessDevices.find(d => d.id === selectedAccessDevice) || null
  const selectedVoceoData = voceoDevices.find(d => d.id === selectedVoceoDevice) || null
  const selectedFireData = fireDevices.find(d => d.id === selectedFireDevice) || null
  const selectedParkingData = parkingDevices.find(d => d.id === selectedParkingDevice) || null

  const catalogCameraModels = useMemo(() => {
    const customItems = typeof window !== 'undefined' ? getCatalogItems('cameras') : []
    const map = new Map<string, { id: string; model: string; type: PlannerCamera['type']; resolution?: string; focalLength?: string; fov?: number; description?: string }>()

    VIVOTEK_CAMERAS.forEach(m => {
      map.set(m.model.toLowerCase(), {
        id: m.id,
        model: m.model,
        type: m.type as PlannerCamera['type'],
        resolution: m.resolution,
        focalLength: m.focalLength,
        fov: m.fov,
        description: m.description,
      })
    })

    customItems.forEach(m => {
      const key = (m.modelo || m.id).toLowerCase()
      if (!map.has(key)) {
        const modName = m.modelo || m.id
        let t: PlannerCamera['type'] = 'dome'
        const u = modName.toUpperCase()
        if (u.startsWith('IB') || u.startsWith('IT') || u.includes('BULLET')) t = 'bullet'
        else if (u.startsWith('FE') || u.startsWith('SC') || u.includes('FISHEYE')) t = 'fisheye'
        else if (u.startsWith('SD') || u.includes('PTZ') || u.includes('SPEED DOME')) t = 'ptz'
        else if (u.startsWith('CC') || u.startsWith('MS') || u.includes('PANORAMIC')) t = 'panoramic'
        map.set(key, {
          id: m.id,
          model: modName,
          type: t,
          resolution: m.descripcion || '2MP',
          fov: t === 'fisheye' ? 360 : t === 'panoramic' ? 180 : t === 'ptz' ? 60 : 90,
          description: m.descripcion,
        })
      }
    })

    return Array.from(map.values())
  }, [])

  const currentModelKey = useMemo(() => {
    if (!selectedCameraData) return ''
    const nameToMatch = (selectedCameraData.modelName || selectedCameraData.name || '').trim()
    const cleanName = nameToMatch.split(' - ')[0].trim().toLowerCase()
    const idToMatch = (selectedCameraData.modelId || '').trim().toLowerCase()

    const found = catalogCameraModels.find(m => {
      const mId = (m.id || '').toLowerCase()
      const mMod = (m.model || '').toLowerCase()
      return mId === idToMatch || mMod === cleanName || mId === cleanName || mMod === idToMatch
    })

    return found ? (found.id || found.model) : (selectedCameraData.modelId || '')
  }, [selectedCameraData, catalogCameraModels])

  const getTypeLabel = (t?: PlannerCamera['type']) => {
    switch (t) {
      case 'bullet': return 'Bullet'
      case 'dome': return 'Domo'
      case 'fisheye': return 'Ojo de Pez (360°)'
      case 'panoramic': return 'Panorámica (180°)'
      case 'ptz': return 'PTZ'
      default: return 'Domo'
    }
  }

  const handleSelectCameraModel = (selectedModelVal: string) => {
    if (!selectedCameraData) return
    const modelItem = catalogCameraModels.find(
      m => m.id.toLowerCase() === selectedModelVal.toLowerCase() ||
           m.model.toLowerCase() === selectedModelVal.toLowerCase()
    )
    if (!modelItem) return

    const prevModelName = selectedCameraData.modelName || selectedCameraData.name
    const prevType = selectedCameraData.type

    const prevProps: Partial<PlannerCamera> = {
      modelId: selectedCameraData.modelId,
      modelName: selectedCameraData.modelName,
      name: selectedCameraData.name,
      type: selectedCameraData.type,
      fov: selectedCameraData.fov,
      resolution: selectedCameraData.resolution,
      focalLength: selectedCameraData.focalLength,
      sensorFormat: selectedCameraData.sensorFormat,
      coverageShape: selectedCameraData.coverageShape,
    }

    const inferred = inferCameraPropsFromModel(modelItem)
    const newModelName = inferred.modelName!
    const newType = inferred.type!

    const seq = selectedCameraData.sequence ?? ''
    const newName = seq ? `${newModelName} - ${seq}` : `${newModelName}`

    const updates: Partial<PlannerCamera> = {
      ...inferred,
      name: newName,
    }

    const prevLabel = `${prevModelName} (${getTypeLabel(prevType)})`
    const newLabel = `${newModelName} (${getTypeLabel(newType)})`

    if (onRecordModelChange) {
      onRecordModelChange({
        cameraId: selectedCameraData.id,
        prevProps,
        newProps: updates,
        prevModelDisplay: prevLabel,
        newModelDisplay: newLabel,
      })
    }

    onCameraUpdate(selectedCameraData.id, updates)

    setIsModelAnimating(true)
    setTimeout(() => setIsModelAnimating(false), 1200)
    if (onTriggerFlash) onTriggerFlash(selectedCameraData.id)

    toast({
      title: 'Modelo de Cámara Actualizado',
      description: `Cámara ${seq ? '#' + seq : ''}: Se modificó el modelo de "${prevLabel}" a "${newLabel}".`,
      duration: 4000,
    })
  }

  const handleUndoModelClick = () => {
    if (onUndoModelChange) {
      onUndoModelChange()
    }
  }

  if (!selectedCameraData && !selectedDeviceData && !selectedVoceoData && !selectedFireData && !selectedParkingData) return null
  if (minimized) return null
  return (
    <div
      ref={panelRef}
      className={`flex flex-col h-full w-full bg-card/95 backdrop-blur-md border-0 shadow-none overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: `rgba(255,255,255,${opacity})` }}
    >
      {/* Header Fijo con título, botón de flecha de ocultado y botón de eliminar/cerrar */}
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-xs truncate">Propiedades</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Flecha para ocultar/plegar el panel a la derecha (solicitud explícita del usuario) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMinimizedChange(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Ocultar Panel (Flecha)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Botón Eliminar */}
          {selectedCameraData && (
            <Button variant="ghost" size="sm" onClick={() => onCameraDelete(selectedCameraData.id)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Eliminar Cámara">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {selectedDeviceData && (
            <Button variant="ghost" size="sm" onClick={() => onAccessDeviceDelete(selectedDeviceData.id)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Eliminar Dispositivo">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {selectedVoceoData && (
            <Button variant="ghost" size="sm" onClick={() => onVoceoDeviceDelete(selectedVoceoData.id)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Eliminar Dispositivo">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {selectedFireData && (
            <Button variant="ghost" size="sm" onClick={() => onFireDeviceDelete(selectedFireData.id)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Eliminar Dispositivo">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {selectedParkingData && (
            <Button variant="ghost" size="sm" onClick={() => onParkingDeviceDelete(selectedParkingData.id)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Eliminar Parquímetro">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Botón de Cierre */}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted" title="Cerrar (Esc)">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cuerpo Desplazable Interno */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs scrollbar-thin">
        {selectedCameraData && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-medium text-muted-foreground">Opacidad Panel</span>
              <input type="range" min={0.85} max={0.95} step={0.01} value={opacity} onChange={(e) => onOpacityChange(Number(e.target.value))} className="w-24 h-1.5" />
            </div>

            {/* Sección de Selección de Modelo de Cámara de Catálogo */}
            <div className="mb-3">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Modelo de Cámara (Catálogo)
                </label>
                {(undoCount ?? 0) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUndoModelClick}
                    className="h-5 px-2 text-[10px] font-semibold gap-1 text-primary hover:bg-primary/10 border-primary/40 rounded-md shadow-xs transition-all hover:scale-105"
                    title="Deshacer cambio de modelo (Ctrl + Z)"
                  >
                    <Undo2 className="h-3 w-3" />
                    <span>Deshacer (Ctrl+Z)</span>
                  </Button>
                )}
              </div>

              <div
                className={`relative transition-all duration-500 rounded-xl border p-2.5 bg-background/95 ${
                  isModelAnimating
                    ? 'ring-4 ring-primary/60 bg-primary/15 scale-[1.03] shadow-2xl border-primary animate-pulse'
                    : 'border-border/80 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Insignia / Ícono característico del tipo de cámara seleccionado */}
                  <div
                    className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 border transition-all duration-500 ${
                      isModelAnimating ? 'scale-125 rotate-12 shadow-lg bg-primary text-primary-foreground border-primary' : ''
                    }`}
                    style={!isModelAnimating ? {
                      backgroundColor: (CAMERA_TYPE_COLORS[selectedCameraData.type] || CAMERA_TYPE_COLORS.dome).icon + '22',
                      borderColor: (CAMERA_TYPE_COLORS[selectedCameraData.type] || CAMERA_TYPE_COLORS.dome).stroke,
                      color: (CAMERA_TYPE_COLORS[selectedCameraData.type] || CAMERA_TYPE_COLORS.dome).icon,
                    } : undefined}
                    title={`Tipo: ${getTypeLabel(selectedCameraData.type)}`}
                  >
                    <CameraTypeSymbol type={selectedCameraData.type} />
                  </div>

                  {/* Selector Desplegable del Catálogo Completo de Cámaras */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={currentModelKey}
                      onChange={(e) => handleSelectCameraModel(e.target.value)}
                      className="w-full text-xs font-extrabold bg-transparent border-0 focus:ring-0 cursor-pointer truncate py-0.5 text-foreground focus:outline-none"
                    >
                      <option value="" disabled>-- Seleccionar Modelo de Catálogo --</option>
                      {catalogCameraModels.map((m) => (
                        <option key={m.id || m.model} value={m.id || m.model}>
                          {m.model} ({getTypeLabel(m.type)}) • {m.resolution || '2MP'}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                      <span className="font-semibold text-foreground/90">{selectedCameraData.modelName || selectedCameraData.name}</span>
                      <span>•</span>
                      <span className="capitalize font-medium">{getTypeLabel(selectedCameraData.type)}</span>
                      <span>•</span>
                      <span>FOV {selectedCameraData.fov || 90}°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo para la etiqueta/nombre editable de la cámara */}
              <div className="mt-2">
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">Nombre / Etiqueta Personalizada</label>
                <input
                  type="text"
                  value={selectedCameraData.name}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background/50 focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Nombre de la cámara"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedCameraData.labelVisible ?? selectedCameraData.name.trim().length > 0}
                onCheckedChange={(v) => onCameraUpdate(selectedCameraData.id, { labelVisible: !!v })}
              />
              <span className="text-xs">Mostrar nombre</span>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Tamaño de Fuente (Etiqueta)</label>
            <input
              type="range"
              min="8"
              max="24"
              value={selectedCameraData.labelFontSize ?? 10}
              onChange={(e) => onCameraUpdate(selectedCameraData.id, { labelFontSize: Number(e.target.value) })}
              className="w-full mb-2"
            />

            <label className="block text-xs font-medium mt-2 mb-1">Fuente (Etiqueta)</label>
            <select
              value={selectedCameraData.labelFontFamily ?? 'Arial'}
              onChange={(e) => onCameraUpdate(selectedCameraData.id, { labelFontFamily: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>

            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCameraData.labelFontWeight === 'bold'}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { labelFontWeight: e.target.checked ? 'bold' : 'normal' })}
                  className="rounded"
                />
                Negrita
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCameraData.labelFontStyle === 'italic'}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { labelFontStyle: e.target.checked ? 'italic' : 'normal' })}
                  className="rounded"
                />
                Cursiva
              </label>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-medium mb-1">Color de fuente (etiqueta)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedCameraData.labelFontColor || '#1e293b'}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { labelFontColor: e.target.value })}
                  className="h-8 w-16 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="text"
                  value={selectedCameraData.labelFontColor || '#1e293b'}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { labelFontColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background/50"
                />
              </div>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Rotación (°)</label>
            <input type="range" min="0" max="360" value={selectedCameraData.rotation} onChange={(e) => onCameraUpdate(selectedCameraData.id, { rotation: Number(e.target.value) })} className="w-full mb-2" />

            <label className="block text-xs font-medium mt-2 mb-1">Ángulo de Abertura FOV (°)</label>
            <input type="range" min="15" max="360" value={selectedCameraData.fov || 90} onChange={(e) => onCameraUpdate(selectedCameraData.id, { fov: Number(e.target.value) })} className="w-full mb-2" />

            <Separator className="my-3" />

            <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Parámetros Técnicos y Norma DRI
            </div>

            {/* Checkbox: Ocultar líneas FOV y distancia al objeto */}
            <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted/40 border border-border/60">
              <Checkbox
                id="hide-fov-lines-checkbox"
                checked={hideFovLines}
                onCheckedChange={(v) => onHideFovLinesChange(!!v)}
                className="border-primary/60 data-[state=checked]:bg-primary"
              />
              <label
                htmlFor="hide-fov-lines-checkbox"
                className="text-xs leading-snug cursor-pointer select-none text-foreground/80"
              >
                Ocultar líneas FOV y valor de distancia
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Resolución</label>
                <select
                  value={selectedCameraData.resolution}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { resolution: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border rounded-md bg-background/50"
                >
                  <option value="1920x1080">2MP (1080p)</option>
                  <option value="2560x1440">4MP</option>
                  <option value="2560x1920">5MP</option>
                  <option value="3072x2048">6MP</option>
                  <option value="3840x2160">8MP / 4K</option>
                  <option value="4000x3000">12MP</option>
                  <option value="5184x3888">20MP</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Formato Sensor</label>
                <select
                  value={selectedCameraData.sensorFormat || '1/2.8"'}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { sensorFormat: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border rounded-md bg-background/50"
                >
                  {Object.keys(SENSOR_EQUIVALENCES).map(fmt => (
                    <option key={fmt} value={fmt}>{fmt} ({SENSOR_EQUIVALENCES[fmt].width}mm)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Distancia Focal (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="500"
                  value={selectedCameraData.focalLength ?? 2.8}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { focalLength: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border rounded-md bg-background/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Formato Visual Cobertura</label>
                <select
                  value={selectedCameraData.coverageShape || 'auto'}
                  onChange={(e) => onCameraUpdate(selectedCameraData.id, { coverageShape: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-xs border rounded-md bg-background/50"
                >
                  <option value="auto">Automático (por tipo)</option>
                  <option value="fan">Abanico (Cuña FOV)</option>
                  <option value="semicircle">Semicírculo 180°</option>
                  <option value="circle">Círculo 360°</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-muted-foreground">Alcance Visual Personalizado (m)</label>
                {selectedCameraData.customRadiusMeters !== undefined && (
                  <button
                    type="button"
                    onClick={() => onCameraUpdate(selectedCameraData.id, { customRadiusMeters: undefined })}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.5"
                min="1"
                max="500"
                placeholder="Automático (arrastre tirador rojo)"
                value={selectedCameraData.customRadiusMeters ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value)
                  onCameraUpdate(selectedCameraData.id, { customRadiusMeters: val })
                }}
                className="w-full px-2 py-1.5 text-xs border rounded-md bg-background/50"
              />
            </div>

            {/* Tabla de Distancias DRI */}
            {(() => {
              const dri = calculateDRI({
                rh: selectedCameraData.horizontalRes || selectedCameraData.resolution,
                focalMm: selectedCameraData.focalLength,
                sensorWidthMm: selectedCameraData.sensorWidth,
                sensorFormat: selectedCameraData.sensorFormat,
                cameraType: selectedCameraData.type,
                customRadiusMeters: selectedCameraData.customRadiusMeters
              })
              return (
                <div className="space-y-2 text-xs border rounded-md p-2 bg-muted/30 mb-3">
                  <div className="font-semibold text-xs text-foreground mb-1">Distancias Normalizadas EN 62676-4:</div>
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1">Nivel</th>
                        <th className="py-1">PPM</th>
                        <th className="py-1 text-right">Alcance (m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b/50">
                        <td className="py-1 font-medium text-amber-600">Identificación (I)</td>
                        <td className="py-1">250</td>
                        <td className="py-1 text-right font-bold">{dri.identificationMeters.toFixed(1)} m</td>
                      </tr>
                      <tr className="border-b/50">
                        <td className="py-1 font-medium text-yellow-600">Reconocimiento (R)</td>
                        <td className="py-1">125</td>
                        <td className="py-1 text-right font-bold">{dri.recognitionMeters.toFixed(1)} m</td>
                      </tr>
                      <tr className="border-b/50">
                        <td className="py-1 font-medium text-emerald-600">Observación (O)</td>
                        <td className="py-1">63</td>
                        <td className="py-1 text-right font-bold">{dri.observationMeters.toFixed(1)} m</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-sky-600">Detección (D)</td>
                        <td className="py-1">25</td>
                        <td className="py-1 text-right font-bold">{dri.detectionMeters.toFixed(1)} m</td>
                      </tr>
                    </tbody>
                  </table>

                  {dri.warnings.length > 0 && (
                    <div className="mt-2 text-[10px] text-destructive bg-destructive/10 p-1.5 rounded border border-destructive/20">
                      ⚠️ {dri.warnings.join(' ')}
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground italic leading-snug mt-1">
                    💡 {dri.recommendation}
                  </div>
                </div>
              )
            })()}

            {/* SECCIÓN CAMPO DE VISIÓN (CDV) */}
            <div className="border rounded-md bg-slate-900/90 text-slate-100 overflow-hidden mb-3 shadow-md border-slate-700/80">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700 font-semibold text-xs text-slate-100">
                <span>Campo De Visión (CDV)</span>
                <ChevronsRight className="h-4 w-4 text-slate-400 rotate-90 cursor-pointer hover:text-white" />
              </div>
              <div className="p-3 space-y-3 text-xs">
                {/* Distancia hasta el Objeto (m) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Distancia hasta el Objeto (m)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCameraData.distanceToObject ?? 15}
                      onChange={(e) => {
                        const dist = Number(e.target.value)
                        const fovRad = ((selectedCameraData.fov || 90) * Math.PI) / 180
                        const calcW = Math.round(2 * dist * Math.tan(fovRad / 2) * 100) / 100
                        onCameraUpdate(selectedCameraData.id, {
                          distanceToObject: dist,
                          customRadiusMeters: dist,
                          cdvWidth: calcW
                        })
                      }}
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    >
                      {DISTANCIA_OBJETO_OPTIONS.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-center h-8 w-10 bg-sky-500/20 text-sky-400 rounded border border-sky-500/40 shrink-0" title="Distancia al Objeto">
                      <ArrowLeftRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Altura de instalación (m) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Altura de instalación (m)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCameraData.installationHeight ?? 4}
                      onChange={(e) => {
                        const hInst = Number(e.target.value)
                        onCameraUpdate(selectedCameraData.id, { installationHeight: hInst })
                      }}
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    >
                      {ALTURA_INSTALACION_OPTIONS.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-center h-8 w-10 bg-sky-500/20 text-sky-400 rounded border border-sky-500/40 shrink-0" title="Altura de Instalación">
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Altura del Objeto (m) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Altura del Objeto (m)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCameraData.objectHeight ?? 2}
                      onChange={(e) => {
                        const hObj = Number(e.target.value)
                        onCameraUpdate(selectedCameraData.id, { objectHeight: hObj })
                      }}
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    >
                      {ALTURA_OBJETO_OPTIONS.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-center h-8 w-10 bg-sky-500/20 text-sky-400 rounded border border-sky-500/40 shrink-0" title="Altura del Objeto">
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Ancho CDV (m) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Ancho CDV (m)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCameraData.cdvWidth ?? 27.22}
                      onChange={(e) => {
                        const width = Number(e.target.value)
                        const dist = selectedCameraData.distanceToObject || 15
                        const calcFov = Math.round(2 * Math.atan(width / (2 * dist)) * (180 / Math.PI))
                        onCameraUpdate(selectedCameraData.id, {
                          cdvWidth: width,
                          fov: calcFov,
                          viewAngle1: calcFov
                        })
                      }}
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    >
                      {ANCHO_CDV_OPTIONS.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-center h-8 w-10 bg-sky-500/20 text-sky-400 rounded border border-sky-500/40 shrink-0" title="Ancho CDV">
                      <ArrowLeftRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Ángulos de Visión ° */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Ángulos de Visión °
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCameraData.viewAngle1 ?? selectedCameraData.fov ?? 95}
                      onChange={(e) => {
                        const a1 = Number(e.target.value)
                        const dist = selectedCameraData.distanceToObject || 15
                        const calcW = Math.round(2 * dist * Math.tan(((a1 * Math.PI) / 180) / 2) * 100) / 100
                        onCameraUpdate(selectedCameraData.id, {
                          viewAngle1: a1,
                          fov: a1,
                          cdvWidth: calcW
                        })
                      }}
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    >
                      {ANGULOS_VISION_OPTIONS.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedCameraData.viewAngle2 ?? 69}
                      onChange={(e) => {
                        const a2 = Number(e.target.value)
                        onCameraUpdate(selectedCameraData.id, { viewAngle2: a2 })
                      }}
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                    >
                      {ANGULOS_VISION_OPTIONS.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-center h-8 w-10 bg-sky-500/20 text-sky-400 rounded border border-sky-500/40 shrink-0" title="Ángulos Visuales">
                      <ArrowLeftRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Controles Complementarios: status 0 y siluetas */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center border border-slate-600 text-sky-400" title="Línea de Visión">
                      <Video className="h-3 w-3" />
                    </div>
                    <select
                      value={selectedCameraData.cameraVisionLineStatus ?? 0}
                      onChange={(e) => onCameraUpdate(selectedCameraData.id, { cameraVisionLineStatus: Number(e.target.value) })}
                      className="w-14 px-1.5 py-1 text-xs border border-slate-600 rounded bg-slate-800 text-slate-100 font-medium"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200" title="Persona genérica (Silueta)">
                      <Checkbox
                        checked={selectedCameraData.personGenericChecked ?? true}
                        onCheckedChange={(v) => onCameraUpdate(selectedCameraData.id, { personGenericChecked: !!v })}
                        className="border-slate-500 data-[state=checked]:bg-sky-500"
                      />
                      <User className="h-4 w-4 text-amber-400" />
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200" title="Persona ejecutiva / perfil profesional">
                      <Checkbox
                        checked={selectedCameraData.personTieChecked ?? true}
                        onCheckedChange={(v) => onCameraUpdate(selectedCameraData.id, { personTieChecked: !!v })}
                        className="border-slate-500 data-[state=checked]:bg-sky-500"
                      />
                      <UserCheck className="h-4 w-4 text-sky-400" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN IMAGEN DE PRODUCTO */}
            <div className="border rounded-md bg-slate-900/90 text-slate-100 overflow-hidden mb-3 shadow-md border-slate-700/80">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700 font-semibold text-xs text-slate-100">
                <span>Imagen de producto</span>
                <ChevronsRight className="h-4 w-4 text-slate-400 rotate-90 cursor-pointer hover:text-white" />
              </div>
              <div className="relative p-3 flex items-center justify-center bg-white rounded-b-md min-h-[160px]">
                {/* Badge de Información en la esquina superior derecha */}
                <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md font-bold text-xs cursor-pointer hover:bg-sky-600 transition-colors" title="Especificaciones del modelo VIVOTEK">
                  i
                </div>
                <img
                  src="https://images.unsplash.com/photo-1557862921-37829c790f19?auto=format&fit=crop&w=400&q=80"
                  alt="Cámara Domo VIVOTEK con conector de cable"
                  className="max-h-40 w-auto object-contain drop-shadow-md rounded"
                />
              </div>
            </div>
            <div className="space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Opacidad Cobertura</span>
                <span className="text-xs text-muted-foreground">{Math.round((selectedCameraData.coverageOpacity ?? 0.8) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={selectedCameraData.coverageOpacity ?? 0.8}
                onChange={(e) => onCameraUpdate(selectedCameraData.id, { coverageOpacity: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  checked={selectedCameraData.coverageAnimated ?? false}
                  onCheckedChange={(v) => onCameraUpdate(selectedCameraData.id, { coverageAnimated: !!v })}
                />
                <span className="text-xs">Efecto de barrido / animación radar</span>
              </div>
            </div>

            {/* SECCIÓN PALETA DE COLORES DE COBERTURA */}
            <div className="space-y-2 mb-3 border-t pt-2 border-slate-700/60">
              <label className="block text-xs font-medium text-slate-200">
                Paleta de Colores de Cobertura (DRI)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_THEME_PRESETS.map((preset) => {
                  const isActive = !preset.colors 
                    ? !selectedCameraData.coverageColors 
                    : JSON.stringify(selectedCameraData.coverageColors) === JSON.stringify(preset.colors)
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onCameraUpdate(selectedCameraData.id, { coverageColors: preset.colors || undefined })}
                      className={`h-7 px-2 text-[11px] rounded flex items-center gap-1.5 transition-all border ${
                        isActive 
                          ? 'border-sky-400 bg-sky-500/20 text-white font-semibold shadow-sm' 
                          : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={`Aplicar paleta ${preset.name}`}
                    >
                      <span className="h-3 w-3 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: preset.color }} />
                      <span>{preset.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        {selectedDeviceData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-foreground truncate">Propiedades (Acceso)</span>
            </div>
            <input
              type="text"
              value={selectedDeviceData.name}
              onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { name: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
              placeholder="Nombre del dispositivo"
            />

            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedDeviceData.labelVisible ?? selectedDeviceData.name.trim().length > 0}
                onCheckedChange={(v) => onAccessDeviceUpdate(selectedDeviceData.id, { labelVisible: !!v })}
              />
              <span className="text-xs">Mostrar nombre</span>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Tamaño de Fuente (Etiqueta)</label>
            <input
              type="range"
              min={DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE}
              max="24"
              value={selectedDeviceData.labelFontSize ?? DEFAULT_ACCESS_LABEL_FONT_SIZE}
              onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { labelFontSize: Number(e.target.value) })}
              className="w-full mb-2"
            />

            <label className="block text-xs font-medium mt-2 mb-1">Fuente (Etiqueta)</label>
            <select
              value={selectedDeviceData.labelFontFamily ?? DEFAULT_ACCESS_LABEL_FONT_FAMILY}
              onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { labelFontFamily: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>

            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDeviceData.labelFontWeight === 'bold'}
                  onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { labelFontWeight: e.target.checked ? 'bold' : 'normal' })}
                  className="rounded"
                />
                Negrita
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDeviceData.labelFontStyle === 'italic'}
                  onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { labelFontStyle: e.target.checked ? 'italic' : 'normal' })}
                  className="rounded"
                />
                Cursiva
              </label>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-medium mb-1">Color de fuente (etiqueta)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedDeviceData.labelFontColor || '#1e293b'}
                  onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { labelFontColor: e.target.value })}
                  className="h-8 w-16 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="text"
                  value={selectedDeviceData.labelFontColor || '#1e293b'}
                  onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { labelFontColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background/50"
                />
              </div>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Rotación</label>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedDeviceData.rotation}
              onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { rotation: Number(e.target.value) })}
              className="w-full mb-2"
            />
          </div>
        )}
        {selectedVoceoData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-foreground truncate">Propiedades (Voceo)</span>
            </div>
            <input
              type="text"
              value={selectedVoceoData.name}
              onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { name: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
              placeholder="Nombre del dispositivo"
            />

            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedVoceoData.labelVisible ?? selectedVoceoData.name.trim().length > 0}
                onCheckedChange={(v) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelVisible: !!v })}
              />
              <span className="text-xs">Mostrar nombre</span>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Tamaño de Fuente (Etiqueta)</label>
            <input
              type="range"
              min="8"
              max="24"
              value={selectedVoceoData.labelFontSize ?? DEFAULT_ACCESS_LABEL_FONT_SIZE}
              onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelFontSize: Number(e.target.value) })}
              className="w-full mb-2"
            />

            <label className="block text-xs font-medium mt-2 mb-1">Fuente (Etiqueta)</label>
            <select
              value={selectedVoceoData.labelFontFamily ?? DEFAULT_ACCESS_LABEL_FONT_FAMILY}
              onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelFontFamily: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>

            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedVoceoData.labelFontWeight === 'bold'}
                  onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelFontWeight: e.target.checked ? 'bold' : 'normal' })}
                  className="rounded"
                />
                Negrita
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedVoceoData.labelFontStyle === 'italic'}
                  onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelFontStyle: e.target.checked ? 'italic' : 'normal' })}
                  className="rounded"
                />
                Cursiva
              </label>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-medium mb-1">Color de fuente (etiqueta)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedVoceoData.labelFontColor || '#1e293b'}
                  onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelFontColor: e.target.value })}
                  className="h-8 w-16 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="text"
                  value={selectedVoceoData.labelFontColor || '#1e293b'}
                  onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { labelFontColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background/50"
                />
              </div>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Rotación</label>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedVoceoData.rotation}
              onChange={(e) => onVoceoDeviceUpdate(selectedVoceoData.id, { rotation: Number(e.target.value) })}
              className="w-full mb-2"
            />
          </div>
        )}
        {selectedFireData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-foreground truncate">Propiedades (Incendio)</span>
            </div>
            <input
              type="text"
              value={selectedFireData.name}
              onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { name: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
              placeholder="Nombre del dispositivo"
            />

            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedFireData.labelVisible ?? selectedFireData.name.trim().length > 0}
                onCheckedChange={(v) => onFireDeviceUpdate(selectedFireData.id, { labelVisible: !!v })}
              />
              <span className="text-xs">Mostrar nombre</span>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Tamaño de Fuente (Etiqueta)</label>
            <input
              type="range"
              min="8"
              max="24"
              value={selectedFireData.labelFontSize ?? 11}
              onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { labelFontSize: Number(e.target.value) })}
              className="w-full mb-2"
            />

            <label className="block text-xs font-medium mt-2 mb-1">Fuente (Etiqueta)</label>
            <select
              value={selectedFireData.labelFontFamily ?? 'sans-serif'}
              onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { labelFontFamily: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>

            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFireData.labelFontWeight === 'bold'}
                  onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { labelFontWeight: e.target.checked ? 'bold' : 'normal' })}
                  className="rounded"
                />
                Negrita
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFireData.labelFontStyle === 'italic'}
                  onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { labelFontStyle: e.target.checked ? 'italic' : 'normal' })}
                  className="rounded"
                />
                Cursiva
              </label>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-medium mb-1">Color de fuente (etiqueta)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedFireData.labelFontColor || '#1e293b'}
                  onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { labelFontColor: e.target.value })}
                  className="h-8 w-16 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="text"
                  value={selectedFireData.labelFontColor || '#1e293b'}
                  onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { labelFontColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background/50"
                />
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="360"
              value={selectedFireData.rotation}
              onChange={(e) => onFireDeviceUpdate(selectedFireData.id, { rotation: Number(e.target.value) })}
              className="w-full mb-2"
            />
          </div>
        )}
        {selectedParkingData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-foreground truncate">Propiedades (Parquímetro)</span>
            </div>
            <input
              type="text"
              value={selectedParkingData.name}
              onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { name: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
              placeholder="Nombre del dispositivo"
            />

            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedParkingData.labelVisible ?? selectedParkingData.name.trim().length > 0}
                onCheckedChange={(v) => onParkingDeviceUpdate(selectedParkingData.id, { labelVisible: !!v })}
              />
              <span className="text-xs">Mostrar nombre</span>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Tamaño de Fuente (Etiqueta)</label>
            <input
              type="range"
              min="8"
              max="24"
              value={selectedParkingData.labelFontSize ?? 10}
              onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { labelFontSize: Number(e.target.value) })}
              className="w-full mb-2"
            />

            <label className="block text-xs font-medium mt-2 mb-1">Fuente (Etiqueta)</label>
            <select
              value={selectedParkingData.labelFontFamily ?? 'sans-serif'}
              onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { labelFontFamily: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50"
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Roboto">Roboto</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>

            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedParkingData.labelFontWeight === 'bold'}
                  onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { labelFontWeight: e.target.checked ? 'bold' : 'normal' })}
                  className="rounded"
                />
                Negrita
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedParkingData.labelFontStyle === 'italic'}
                  onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { labelFontStyle: e.target.checked ? 'italic' : 'normal' })}
                  className="rounded"
                />
                Cursiva
              </label>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-medium mb-1">Color de fuente (etiqueta)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedParkingData.labelFontColor || '#1e293b'}
                  onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { labelFontColor: e.target.value })}
                  className="h-8 w-16 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="text"
                  value={selectedParkingData.labelFontColor || '#1e293b'}
                  onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { labelFontColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background/50"
                />
              </div>
            </div>

            <label className="block text-xs font-medium mt-2 mb-1">Rotación</label>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedParkingData.rotation}
              onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { rotation: Number(e.target.value) })}
              className="w-full mb-2"
            />

            <label className="block text-xs font-medium mt-2 mb-1">Identificador Municipal</label>
            <input type="text" value={selectedParkingData.municipalId || ''} onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { municipalId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50" placeholder="Ej. PQ-100" />

            <label className="block text-xs font-medium mt-2 mb-1">Medio de Pago</label>
            <select value={selectedParkingData.paymentMethod || 'mixto'} onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { paymentMethod: e.target.value as any })} className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50">
              <option value="monedas">Monedas</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="app">App Móvil</option>
              <option value="mixto">Mixto</option>
            </select>

            <label className="block text-xs font-medium mt-2 mb-1">Comunicación</label>
            <select value={selectedParkingData.communication || '4g'} onChange={(e) => onParkingDeviceUpdate(selectedParkingData.id, { communication: e.target.value as any })} className="w-full px-3 py-2 text-sm border rounded-md bg-background/50">
              <option value="4g">4G / LTE</option>
              <option value="wifi">Wi-Fi</option>
              <option value="lorawan">LoRaWAN</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
