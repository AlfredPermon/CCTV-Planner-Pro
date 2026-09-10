"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error(result.error || "Credenciales inválidas");
            } else {
                toast.success("Bienvenido de nuevo");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            toast.error("Ocurrió un error al intentar iniciar sesión");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--primary)/0.15),transparent_70%)]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                <div className="flex flex-col items-center mb-8 gap-2">
                    <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20">
                        <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">editor_cctv</h1>
                    <p className="text-muted-foreground">Acceso Restringido — Sistema CCTV</p>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
                        <CardDescription>
                            Ingresa tus credenciales para acceder a la plataforma
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        placeholder="admin@editorcctv.com"
                                        className="pl-10"
                                        {...register("email")}
                                        disabled={isLoading}
                                        suppressHydrationWarning
                                    />

                                </div>
                                {errors.email && (
                                    <p className="text-sm text-destructive font-medium">{errors.email.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Contraseña</Label>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10"
                                        {...register("password")}
                                        disabled={isLoading}
                                        suppressHydrationWarning
                                    />

                                </div>
                                {errors.password && (
                                    <p className="text-sm text-destructive font-medium">{errors.password.message}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full group" disabled={isLoading}>
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Shield className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                                )}
                                {isLoading ? "Validando..." : "Ingresar al Sistema"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center mt-8 text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} editor_cctv — Professional Security Systems
                </p>
            </motion.div>
        </div>
    );
}
