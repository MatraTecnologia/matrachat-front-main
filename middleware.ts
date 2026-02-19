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

// Em produção (HTTPS) o Better Auth adiciona o prefixo __Secure- automaticamente.
// Verificamos os dois nomes para cobrir dev (http) e prod (https).
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionCookie =
        request.cookies.get('__Secure-better-auth.session_token') ??
        request.cookies.get('better-auth.session_token')
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
