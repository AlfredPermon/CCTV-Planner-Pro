"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const userSchema = z.object({
    name: z.string().min(2, "Nombre demasiado corto"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres").optional().or(z.literal('')),
    role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    user?: any;
    onSuccess: () => void;
}

export function UserFormDialog({ isOpen, onOpenChange, user, onSuccess }: UserFormDialogProps) {
    const isEditing = !!user;

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "VIEWER",
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name || "",
                email: user.email,
                password: "",
                role: user.role as any,
            });
        } else {
            form.reset({
                name: "",
                email: "",
                password: "",
                role: "VIEWER",
            });
        }
    }, [user, form]);

    const onSubmit = async (values: UserFormValues) => {
        const url = isEditing ? `/api/admin/users/${user.id}` : "/api/admin/users";
        const method = isEditing ? "PATCH" : "POST";

        // Only send password if it's set
        const payload = { ...values };
        if (isEditing && !values.password) {
            delete payload.password;
        }

        if (!isEditing && !values.password) {
            toast.error("La contraseña es obligatoria para nuevos usuarios");
            return;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(isEditing ? "Usuario actualizado" : "Usuario creado");
                onOpenChange(false);
                onSuccess();
            } else {
                const data = await res.json();
                toast.error(data.error || "Error al guardar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifica los datos del usuario. Deja la contraseña en blanco para no cambiarla."
                            : "Completa los datos para registrar un nuevo usuario en el sistema."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Juan Pérez" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <FormControl>
                                        <Input placeholder="juan@ejemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rol de Usuario</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un rol" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ADMIN">Administrador</SelectItem>
                                            <SelectItem value="EDITOR">Editor</SelectItem>
                                            <SelectItem value="VIEWER">Visualizador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Guardar Cambios" : "Crear Usuario"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
