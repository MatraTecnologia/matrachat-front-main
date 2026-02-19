import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas — acessíveis sem autenticação
const PUBLIC_PATHS = [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/join-org',
]

// Better Auth define o cookie de sessão com este nome por padrão
const SESSION_COOKIE = 'better-auth.session_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionCookie = request.cookies.get(SESSION_COOKIE)
    const isAuthenticated = !!sessionCookie?.value

    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

    // Usuário não autenticado tentando acessar rota protegida → redireciona ao sign-in
    if (!isPublicPath && !isAuthenticated) {
        const signInUrl = new URL('/sign-in', request.url)
        signInUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(signInUrl)
    }

    // Usuário autenticado tentando acessar rotas de auth → redireciona para dashboard
    if (isPublicPath && isAuthenticated && !pathname.startsWith('/join-org') && !pathname.startsWith('/reset-password')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        // Aplica em todas as rotas exceto arquivos estáticos e API interna do Next.js
        '/((?!_next/static|_next/image|favicon.ico|placeholder.svg).*)',
    ],
}
