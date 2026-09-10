"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    MoreHorizontal,
    UserPlus,
    Pencil,
    Trash2,
    Shield,
    User as UserIcon,
    Eye,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { UserFormDialog } from "@/components/admin/UserFormDialog";


type User = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
};

export function UsersTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                toast.error("Fallo al cargar usuarios");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Usuario eliminado");
                fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Fallo al eliminar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    const openCreateDialog = () => {
        setSelectedUser(undefined);
        setIsDialogOpen(true);
    };

    const openEditDialog = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "ADMIN":
                return <Badge variant="default" className="bg-red-500 hover:bg-red-600"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
            case "EDITOR":
                return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600"><Pencil className="w-3 h-3 mr-1" /> Editor</Badge>;
            case "VIEWER":
                return <Badge variant="outline" className="border-gray-400 text-gray-600"><Eye className="w-3 h-3 mr-1" /> Viewer</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Listado de Usuarios
                </h2>
                <Button onClick={openCreateDialog} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Usuario
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Fecha Creación</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No hay usuarios registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <UserFormDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={selectedUser}
                onSuccess={fetchUsers}
            />
        </div>
    );
}
