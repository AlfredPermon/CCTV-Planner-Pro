'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Camera, Upload, Download, Calculator, MessageSquare, Layout, Eye, HardDrive, Network, FilePlus, Save, FolderOpen, Clock, ChevronDown, FileJson, Trash2 } from 'lucide-react'
import CCTVCanvas from '@/components/cctv/CCTVCanvas'
import CameraCatalog from '@/components/cctv/CameraCatalog'
import AccessControlCatalog from '@/components/access/AccessControlCatalog'
import CalculationsPanel from '@/components/cctv/CalculationsPanel'
import AssistantPanel from '@/components/cctv/AssistantPanel'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { ExportToPDFDialog } from '@/components/export/ExportToPDFDialog'

// IndexedDB Utilities for Project Persistence
const DB_NAME = 'CCTVPlannerDB'
const STORE_NAME = 'projects'

const initDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined') return
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const saveProjectToDB = async (project: any) => {
  try {
    const db = await initDB()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(project)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) { console.error('Error saving to DB', e) }
}

const loadProjectFromDB = async (id: string) => {
  try {
    const db = await initDB()
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (e) { console.error('Error loading from DB', e); return null }
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
    cameras: Camera[]
    iconScales: Record<string, number>
    accessDevices: AccessDevice[]
  }
}


export interface Camera {
  id: string
  type: 'dome' | 'fisheye' | 'bullet' | 'panoramic' | 'ptz'
  name: string
  x: number
  y: number
  rotation: number
  fov: number
  resolution: string
  bitrate: number
  fps: number
  labelOffsetX?: number
  labelOffsetY?: number
}

export interface FloorPlan {
  id: string
  name: string
  url: string
  width: number
  height: number
  scaleMetersPerPixel?: number
  locked?: boolean
  scalePoints?: { ax: number; ay: number; bx: number; by: number }
}

export interface AccessDevice {
  id: string
  type: 'terminal' | 'lock' | 'exit_button' | 'emergency_button'
  name: string
  x: number
  y: number
  rotation: number
  labelOffsetX?: number
  labelOffsetY?: number
}

export default function CCTVPlanningTool() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [accessDevices, setAccessDevices] = useState<AccessDevice[]>([])
  const [selectedAccessDevice, setSelectedAccessDevice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('design')
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [iconScales, setIconScales] = useState<Record<string, number>>({})
  const [showScaleInstruction, setShowScaleInstruction] = useState(false)
  const [defineScaleMode, setDefineScaleMode] = useState(false)
  const [scaleInputOpen, setScaleInputOpen] = useState(false)
  const [realDistance, setRealDistance] = useState<string>('')
  const [blockBackground, setBlockBackground] = useState<boolean>(false)
  const scaleSelectionRef = useRef<{ ax: number; ay: number; bx: number; by: number; pixelDistance: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  // Project Management State
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null)
  const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [confirmNewProjectOpen, setConfirmNewProjectOpen] = useState(false)
  const [projectNameInput, setProjectNameInput] = useState('')
  const [projectDescInput, setProjectDescInput] = useState('')
  const [projectSaveSuccess, setProjectSaveSuccess] = useState<{name: string, path: string} | null>(null)
  
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
    setFloorPlan(null)
    setSelectedCamera(null)
    setSelectedAccessDevice(null)
    setIconScales({})
    setCurrentProject(null)
    setConfirmNewProjectOpen(false)
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
    if (!projectNameInput.trim()) return

    // Determine ID: keep existing if name matches (Update), otherwise generate new (Save As)
    const isUpdate = currentProject && currentProject.name === projectNameInput
    const projectId = isUpdate ? currentProject.id : crypto.randomUUID()

    const meta: ProjectMetadata = {
      id: projectId,
      name: projectNameInput,
      description: projectDescInput,
      lastModified: new Date().toISOString(),
      version: '1.0'
    }

    const projectData: SavedProject = {
      id: meta.id,
      metadata: meta,
      data: {
        floorPlan,
        cameras,
        iconScales,
        accessDevices
      }
    }

    // Save to IndexedDB for "Recent Projects" auto-load capability
    await saveProjectToDB(projectData)

    // Download JSON file
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectNameInput.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.cctv.json`
    a.click()
    URL.revokeObjectURL(url)

    // Update state
    setCurrentProject(meta)
    setRecentProjects(prev => {
      const filtered = prev.filter(p => p.id !== meta.id)
      return [meta, ...filtered].slice(0, 5)
    })
    
    setSaveDialogOpen(false)
    setProjectSaveSuccess({ name: meta.name, path: 'Descargas (Local)' })
    setTimeout(() => setProjectSaveSuccess(null), 3000)
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
        const json = JSON.parse(event.target?.result as string) as SavedProject
        if (!json.metadata || !json.data) throw new Error('Formato inválido')
        
        // Ensure ID is present in root for IndexedDB
        if (!json.id && json.metadata.id) {
          json.id = json.metadata.id
        }

        // Restore state
        setFloorPlan(json.data.floorPlan)
        setCameras(json.data.cameras)
        setIconScales(json.data.iconScales)
        setCurrentProject(json.metadata)
        
        // Update recents and DB
        await saveProjectToDB(json)
        setRecentProjects(prev => {
          const filtered = prev.filter(p => p.id !== json.metadata.id)
          return [json.metadata, ...filtered].slice(0, 5)
        })
      } catch (err) {
        alert('Error al abrir el proyecto: Formato inválido o corrupto')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const loadRecentProject = async (project: ProjectMetadata) => {
    try {
      const saved = await loadProjectFromDB(project.id)
      if (saved) {
        setFloorPlan(saved.data.floorPlan)
        setCameras(saved.data.cameras)
        setIconScales(saved.data.iconScales)
        setAccessDevices(saved.data.accessDevices ?? [])
        setCurrentProject(saved.metadata)
        
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
    try {
      const fp = localStorage.getItem('cctv-floorPlan')
      const cams = localStorage.getItem('cctv-cameras')
      const sel = localStorage.getItem('cctv-selectedCamera')
      const scales = localStorage.getItem('cctv-iconScales')
      const devices = localStorage.getItem('cctv-accessDevices')
      const selDev = localStorage.getItem('cctv-selectedAccessDevice')
      if (fp) setFloorPlan(JSON.parse(fp))
      if (cams) setCameras(JSON.parse(cams))
      if (sel) setSelectedCamera(JSON.parse(sel))
      if (scales) setIconScales(JSON.parse(scales))
      if (devices) setAccessDevices(JSON.parse(devices))
      if (selDev) setSelectedAccessDevice(JSON.parse(selDev))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('cctv-floorPlan', JSON.stringify(floorPlan)) } catch {}
  }, [floorPlan])
  useEffect(() => {
    try { localStorage.setItem('cctv-cameras', JSON.stringify(cameras)) } catch {}
  }, [cameras])
  useEffect(() => {
    try { localStorage.setItem('cctv-selectedCamera', JSON.stringify(selectedCamera)) } catch {}
  }, [selectedCamera])
  useEffect(() => {
    try { localStorage.setItem('cctv-iconScales', JSON.stringify(iconScales)) } catch {}
  }, [iconScales])
  useEffect(() => {
    try { localStorage.setItem('cctv-accessDevices', JSON.stringify(accessDevices)) } catch {}
  }, [accessDevices])
  useEffect(() => {
    try { localStorage.setItem('cctv-selectedAccessDevice', JSON.stringify(selectedAccessDevice)) } catch {}
  }, [selectedAccessDevice])

  const handleAddCamera = (cameraType: Camera['type']) => {
    if (!floorPlan) return
    const newCamera: Camera = {
      id: crypto.randomUUID(),
      type: cameraType,
      name: `${cameraType.charAt(0).toUpperCase() + cameraType.slice(1)} Camera ${cameras.length + 1}`,
      x: 400,
      y: 300,
      rotation: 0,
      fov: cameraType === 'fisheye' ? 360 : cameraType === 'panoramic' ? 180 : 90,
      resolution: '1920x1080',
      bitrate: 4,
      fps: 30,
      labelOffsetX: 0,
      labelOffsetY: -20
    }
    setCameras([...cameras, newCamera])
    setSelectedCamera(newCamera.id)
  }

  const handleUpdateCamera = (id: string, updates: Partial<Camera>) => {
    setCameras(cameras.map(cam => 
      cam.id === id ? { ...cam, ...updates } : cam
    ))
  }

  const handleDeleteCamera = (id: string) => {
    setCameras(cameras.filter(cam => cam.id !== id))
    if (selectedCamera === id) {
      setSelectedCamera(null)
    }
  }

  const handleAddAccessDevice = (type: AccessDevice['type'], modelId?: string) => {
    if (!floorPlan) return
    const idx = accessDevices.length + 1
    const baseName =
      type === 'terminal' ? 'Terminal' :
      type === 'lock' ? 'Chapa Magnética' :
      type === 'exit_button' ? 'Botón de Salida' :
      'Botón de Emergencia'
    const suffix = modelId ? ` (${modelId})` : ` ${idx}`
    const newDevice: AccessDevice = {
      id: crypto.randomUUID(),
      type,
      name: `${baseName}${suffix}`,
      x: 520,
      y: 320,
      rotation: 0,
      labelOffsetX: 0,
      labelOffsetY: -18
    }
    setAccessDevices([...accessDevices, newDevice])
    setSelectedAccessDevice(newDevice.id)
  }

  const handleUpdateAccessDevice = (id: string, updates: Partial<AccessDevice>) => {
    setAccessDevices(accessDevices.map(d => d.id === id ? { ...d, ...updates } : d))
  }

  const handleDeleteAccessDevice = (id: string) => {
    setAccessDevices(accessDevices.filter(d => d.id !== id))
    if (selectedAccessDevice === id) setSelectedAccessDevice(null)
  }

  const handleUploadFloorPlan = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return
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
      } catch {}
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
          img.onerror = () => {}
          img.src = dataUrl
        }
        reader.readAsDataURL(file)
      } catch {}
      return
    }
  }

  const handleExportProject = () => {
    const projectData = {
      floorPlan,
      cameras,
      accessDevices,
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">CCTV Planner Pro</h1>
                <p className="text-sm text-muted-foreground">Sistema de Diseño y Planificación de Vigilancia IP</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Project Management Toolbar */}
              <div className="flex items-center gap-1 mr-2 border-r pr-2">
                <Button variant="ghost" size="sm" onClick={handleNewProject} title="Nuevo Proyecto">
                  <FilePlus className="h-4 w-4 mr-1" />
                  <span className="hidden xl:inline">Nuevo</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleOpenProjectClick} title="Abrir Proyecto">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  <span className="hidden xl:inline">Abrir</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSaveProjectClick} title="Guardar Proyecto">
                  <Save className="h-4 w-4 mr-1" />
                  <span className="hidden xl:inline">Guardar</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" title="Proyectos Recientes">
                      <Clock className="h-4 w-4 mr-1" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Proyectos Recientes</DropdownMenuLabel>
                    <DropdownMenuSeparator />
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
                              {new Date(p.lastModified).toLocaleDateString()} {new Date(p.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
              </div>

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
              
              <Separator orientation="vertical" className="h-6 mx-2" />
              
              <Button variant="outline" size="sm" onClick={() => setIsAssistantOpen(!isAssistantOpen)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                BotIp Asistente
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleExportProject}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-150">
            <TabsTrigger value="design" className="gap-2">
              <Layout className="h-4 w-4" />
              Diseño 2D
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <Camera className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="calculations" className="gap-2">
              <Calculator className="h-4 w-4" />
              Cálculos
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Asistente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="mt-6 space-y-4">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Camera Catalog Sidebar */}
              <Card id="export-catalog-card" className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Catálogo de Cámaras</CardTitle>
                  <CardDescription>Arrastra cámaras al plano</CardDescription>
                </CardHeader>
                <CardContent>
                  <CameraCatalog onAddCamera={handleAddCamera} disabled={!floorPlan} />
                </CardContent>
              </Card>

              {/* Canvas Area */}
              <Card id="export-design-card" className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Plano de Diseño</CardTitle>
                    <CardDescription>
                      {floorPlan ? floorPlan.name : 'Sin plano cargado'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('floor-plan-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Cargar Plano
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setExportOpen(true)}
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
                <CardContent className="p-0">
                  <CCTVCanvas
                    cameras={cameras}
                    accessDevices={accessDevices}
                    floorPlan={floorPlan}
                    selectedCamera={selectedCamera}
                    selectedAccessDevice={selectedAccessDevice}
                    onCameraSelect={setSelectedCamera}
                    onAccessDeviceSelect={setSelectedAccessDevice}
                    onCameraUpdate={handleUpdateCamera}
                    onCameraDelete={handleDeleteCamera}
                    onAccessDeviceUpdate={handleUpdateAccessDevice}
                    onAccessDeviceDelete={handleDeleteAccessDevice}
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
                      setAccessDevices(prev => [...prev, dev])
                      setSelectedAccessDevice(dev.id)
                    }}
                  />
                </CardContent>
              </Card>

              {/* Access Control Catalog and Properties Sidebar */}
              <div className="lg:col-span-1 relative">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Catálogo de Control de Acceso</CardTitle>
                    <CardDescription>Agrega terminales, chapas y botones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AccessControlCatalog onAddDevice={handleAddAccessDevice} disabled={!floorPlan} />
                  </CardContent>
                </Card>

                {/* Properties Panel Overlay */}
              <PropertiesPanel
                cameras={cameras}
                accessDevices={accessDevices}
                selectedCamera={selectedCamera}
                selectedAccessDevice={selectedAccessDevice}
                onClose={() => { setSelectedCamera(null); setSelectedAccessDevice(null) }}
                onCameraUpdate={handleUpdateCamera}
                onCameraDelete={handleDeleteCamera}
                onAccessDeviceUpdate={handleUpdateAccessDevice}
                onAccessDeviceDelete={handleDeleteAccessDevice}
                className="absolute top-0 left-0 w-full h-full z-10"
              />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="mt-6">
            <Card id="export-catalog-card">
              <CardHeader>
                <CardTitle>Catálogo</CardTitle>
                <CardDescription>Navega entre Cámaras y Control de Acceso</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="cams">
                  <TabsList className="mb-4">
                    <TabsTrigger value="cams">Cámaras IP</TabsTrigger>
                    <TabsTrigger value="access">Control de Acceso</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cams">
                    <CameraCatalog onAddCamera={handleAddCamera} detailed={true} disabled={!floorPlan} />
                  </TabsContent>
                  <TabsContent value="access">
                    <AccessControlCatalog onAddDevice={handleAddAccessDevice} disabled={!floorPlan} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculations" className="mt-6">
            <div id="export-calculations-card">
              <CalculationsPanel cameras={cameras} floorPlan={floorPlan} />
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="mt-6">
            <AssistantPanel cameras={cameras} floorPlan={floorPlan} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Assistant Button */}
      {!isAssistantOpen && (
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="lg"
          onClick={() => {
            setIsAssistantOpen(true)
            setActiveTab('assistant')
          }}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

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

      <ExportToPDFDialog open={exportOpen} onOpenChange={setExportOpen} />

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

function PropertiesPanel(props: {
  cameras: Camera[]
  accessDevices: AccessDevice[]
  selectedCamera: string | null
  selectedAccessDevice: string | null
  onClose: () => void
  onCameraUpdate: (id: string, updates: Partial<Camera>) => void
  onCameraDelete: (id: string) => void
  onAccessDeviceUpdate: (id: string, updates: Partial<AccessDevice>) => void
  onAccessDeviceDelete: (id: string) => void
  className?: string
}) {
  const { cameras, accessDevices, selectedCamera, selectedAccessDevice, onClose, onCameraUpdate, onCameraDelete, onAccessDeviceUpdate, onAccessDeviceDelete, className } = props
  const panelRef = useRef<HTMLDivElement | null>(null)
  const selectedCameraData = cameras.find(c => c.id === selectedCamera) || null
  const selectedDeviceData = accessDevices.find(d => d.id === selectedAccessDevice) || null
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!panelRef.current) return
      // Check if click is inside the panel OR inside the canvas area (to prevent closing when working on canvas)
      const canvasCard = document.getElementById('export-design-card')
      const clickedInsideCanvas = canvasCard?.contains(e.target as Node)
      
      if (!panelRef.current.contains(e.target as Node) && !clickedInsideCanvas) {
        if (selectedCameraData || selectedDeviceData) onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedCameraData, selectedDeviceData, onClose])
  if (!selectedCameraData && !selectedDeviceData) return null
  return (
    <Card ref={panelRef} className={`p-4 shadow-lg border ${className ?? ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
      {selectedCameraData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">Propiedades</span>
            <Button variant="ghost" size="sm" onClick={() => onCameraDelete(selectedCameraData.id)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <input type="text" value={selectedCameraData.name} onChange={(e) => onCameraUpdate(selectedCameraData.id, { name: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50" />
          <input type="range" min="0" max="360" value={selectedCameraData.rotation} onChange={(e) => onCameraUpdate(selectedCameraData.id, { rotation: Number(e.target.value) })} className="w-full mb-2" />
          <select value={selectedCameraData.resolution} onChange={(e) => onCameraUpdate(selectedCameraData.id, { resolution: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-md bg-background/50">
            <option value="640x480">VGA</option>
            <option value="1920x1080">1080p</option>
          </select>
        </div>
      )}
      {selectedDeviceData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">Propiedades (Acceso)</span>
            <Button variant="ghost" size="sm" onClick={() => onAccessDeviceDelete(selectedDeviceData.id)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <input type="text" value={selectedDeviceData.name} onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { name: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-md mb-2 bg-background/50" />
          <input type="range" min="0" max="360" value={selectedDeviceData.rotation} onChange={(e) => onAccessDeviceUpdate(selectedDeviceData.id, { rotation: Number(e.target.value) })} className="w-full mb-2" />
        </div>
      )}
    </Card>
  )
}
