
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calculator, Layout, Settings, Shield, LogOut, BarChart3 } from "lucide-react"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardPage() {
  return (
    <div className="w-full px-6 lg:px-8 py-8 space-y-8 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Centro de control para CCTV Planner Pro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="destructive"
            className="flex items-center gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Planner Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-6 w-6 text-blue-500" />
              Planificador Visual
            </CardTitle>
            <CardDescription>
              Diseña la ubicación de cámaras y cobertura sobre planos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="w-full">
              <Button className="w-full">Ir al Planificador</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Reports Card */}
        <Card className="hover:shadow-lg transition-shadow border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Reporte Múltiples Sistemas
            </CardTitle>
            <CardDescription>
              Reportes concentrados, desglose por catálogo y conciliación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reports" className="w-full">
              <Button variant="default" className="w-full bg-primary hover:bg-primary-dim">Ir a Reportes</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Costs Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-green-500" />
              Calculadora de Costos
            </CardTitle>
            <CardDescription>
              Estimación paramétrica y generación de cotizaciones con IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/costs" className="w-full">
              <Button variant="outline" className="w-full">Ir a Costos</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Admin Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-gray-500" />
              Administración
            </CardTitle>
            <CardDescription>
              Gestión de catálogos, precios y configuración del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin" className="w-full">
              <Button variant="secondary" className="w-full">Ir a Admin</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-muted/20 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado del Sistema
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-background rounded-md border">
            <div className="text-sm text-muted-foreground">Versión</div>
            <div className="text-lg font-medium">v1.0.0</div>
          </div>
          <div className="p-4 bg-background rounded-md border">
            <div className="text-sm text-muted-foreground">Motor IA</div>
            <div className="text-lg font-medium text-green-600">Online</div>
          </div>
          <div className="p-4 bg-background rounded-md border">
            <div className="text-sm text-muted-foreground">Base de Datos</div>
            <div className="text-lg font-medium text-green-600">Conectado</div>
          </div>
        </div>
      </div>
    </div>
  )
}
