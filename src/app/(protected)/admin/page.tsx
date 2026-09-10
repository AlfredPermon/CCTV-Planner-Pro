import AdminUI from '@/components/admin/AdminUI'
import Link from 'next/link'


export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
        <div className="flex gap-4">
          <Link href="/admin/users" className="flex items-center text-sm font-medium text-primary hover:underline">
            Gestionar Usuarios →
          </Link>
          <a href="/dashboard" className="text-muted-foreground hover:text-primary">Dashboard</a>
          <a href="/" className="text-muted-foreground hover:text-primary">← Volver al Planificador</a>
        </div>
      </div>
      <AdminUI />
    </div>
  )
}

