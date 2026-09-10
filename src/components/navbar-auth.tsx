"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, User, Settings, LayoutDashboard, BarChart3 } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function NavbarAuth() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const role = (session?.user as any)?.role || "VIEWER";
    const initials = session?.user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                        <Shield className="h-6 w-6 text-primary" />
                        <span>CCTV Planner Pro</span>
                    </Link>
                    <nav className="hidden lg:flex items-center gap-4 text-sm font-medium">
                        <Link href="/dashboard" className={`transition-colors hover:text-primary ${pathname === '/dashboard' ? 'text-primary font-bold' : ''}`}>
                            Dashboard
                        </Link>
                        <Link href="/" className={`transition-colors hover:text-primary ${pathname === '/' ? 'text-primary font-bold' : ''}`}>
                            Planificador
                        </Link>
                        <Link href="/costs" className={`transition-colors hover:text-primary ${pathname === '/costs' ? 'text-primary font-bold' : ''}`}>
                            Presupuestos
                        </Link>
                        <Link href="/reports" className={`flex items-center gap-1.5 transition-colors hover:text-primary ${pathname === '/reports' ? 'text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-md' : ''}`}>
                            <BarChart3 className="h-4 w-4" />
                            <span>Reportes</span>
                        </Link>
                        {role === "ADMIN" && (
                            <>
                                <Link href="/admin" className={`transition-colors hover:text-primary ${pathname === '/admin' ? 'text-primary font-bold' : ''}`}>
                                    Administración
                                </Link>
                                <Link href="/admin/users" className="transition-colors hover:text-primary font-semibold text-primary">
                                    Usuarios
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                <div
                    id="navbar-primary-actions"
                    className="order-3 flex w-full flex-wrap items-center gap-2 lg:order-2 lg:w-auto lg:flex-1 lg:justify-center"
                />

                <div className="order-2 ml-auto flex items-center gap-4 lg:order-3">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-sm font-medium leading-none">{session?.user?.name || "Usuario"}</span>
                        <span className="text-xs text-muted-foreground mt-1 px-1.5 py-0.5 bg-primary/10 rounded-md font-semibold text-primary">
                            {role}
                        </span>
                    </div>

                    <ThemeToggle />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                                    <AvatarFallback className="bg-primary/5 text-primary">{initials}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{session?.user?.name || "Usuario"}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {session?.user?.email || ""}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    <span>Dashboard</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/reports">
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    <span>Reportes Múltiples Sistemas</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                                <User className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configuración</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => signOut({ callbackUrl: "/login" })}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
