import CostsUI from '@/components/costs/CostsUI'

export default function CostsPage() {
  return (
    <div className="container mx-auto p-4 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calculadora Paramétrica de Costos</h1>
        <div className="flex gap-4">
          <a href="/dashboard" className="text-muted-foreground hover:text-primary">Dashboard</a>
          <a href="/admin" className="text-muted-foreground hover:text-primary">Administración</a>
          <a href="/" className="text-blue-500 hover:underline">← Volver al Planificador</a>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <CostsUI />
      </div>
    </div>
  )
}
