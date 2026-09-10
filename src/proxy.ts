import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET || "secret1234!"
    });


    const { pathname } = req.nextUrl;

    // RUTAS PROTEGIDAS
    const protectedPaths = ["/", "/dashboard", "/admin", "/costs"];
    const isProtectedPath = protectedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));

    const role = (token as any)?.role;

    if (isProtectedPath && !token) {
        console.log(`[Middleware] Protecting ${pathname}, no token found. Redirecting to /login`);
        const url = new URL("/login", req.url);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
    }

    // Role-based protection for /admin
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
        console.log(`[Middleware] Unauthorized access to ${pathname} by role ${role}. Redirecting to /dashboard`);
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }



    // Prevenir acceso a login si ya está autenticado
    if (pathname === "/login" && token) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/dashboard/:path*",
        "/admin/:path*",
        "/costs/:path*",
        "/login",
    ],
};
