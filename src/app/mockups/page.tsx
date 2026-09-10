"use client"

import CatalogSidebar from "@/components/ui/catalog-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import CameraCatalog from "@/components/cctv/CameraCatalog"
import AccessControlCatalog from "@/components/access/AccessControlCatalog"
import VoceoCatalog from "@/components/voceo/VoceoCatalog"
import FireDetectionCatalog from "@/components/fire/FireDetectionCatalog"
import { useState } from "react"

export default function Mockups() {
  const [selectedCatalog, setSelectedCatalog] = useState<"cameras" | "access" | "voceo" | "fire" | null>("cameras")
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4">Mockups – CCTV Planner Pro</h2>
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <CatalogSidebar selected={selectedCatalog} onSelect={setSelectedCatalog} />
          </div>
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-lg">Vista de Fichas</CardTitle>
              <CardDescription>Estados hover y selected visibles por estilos</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCatalog === "cameras" && (
                <CameraCatalog onAddCamera={() => {}} detailed={true} disabled={false} />
              )}
              {selectedCatalog === "access" && (
                <AccessControlCatalog onAddDevice={() => {}} disabled={false} />
              )}
              {selectedCatalog === "voceo" && (
                <VoceoCatalog onAddDevice={() => {}} disabled={false} />
              )}
              {selectedCatalog === "fire" && (
                <FireDetectionCatalog onAddDevice={() => {}} disabled={false} />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-2">Vista Responsive (Tablet)</h3>
          <div className="border rounded-lg p-4">
            <div className="max-w-205 mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                <CatalogSidebar selected={selectedCatalog} onSelect={setSelectedCatalog} />
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Contenido</CardTitle>
                    <CardDescription>Adaptado a ancho tablet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 bg-muted rounded-md" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
