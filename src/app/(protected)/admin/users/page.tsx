import { UsersTable } from "@/components/admin/UsersTable";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminUsersPage() {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 px-2 text-muted-foreground">
                        <Link href="/admin">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Volver a Administración
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
                        <p className="text-muted-foreground">
                            Administra los perfiles y permisos de acceso al sistema.
                        </p>
                    </div>
                </div>
            </div>

            <UsersTable />
        </div>
    );
}
