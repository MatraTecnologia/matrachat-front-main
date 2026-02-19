import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas — acessíveis sem autenticação
const PUBLIC_PATHS = [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/join-org',
    '/unauthorized', // página de acesso negado
]

// Em produção (HTTPS) o Better Auth adiciona o prefixo __Secure- automaticamente.
// Verificamos os dois nomes para cobrir dev (http) e prod (https).
export async function middleware(request: NextRequest) {
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
    if (isPublicPath && isAuthenticated && !pathname.startsWith('/join-org') && !pathname.startsWith('/reset-password') && !pathname.startsWith('/unauthorized')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ─── VALIDAÇÃO DE TENANT (multi-tenant) ──────────────────────────────────────
    // Se o usuário está autenticado e não está em rota pública, valida acesso ao tenant
    if (isAuthenticated && !isPublicPath) {
        // Pega o hostname correto (prioriza headers de proxy)
        const hostname =
            request.headers.get('x-forwarded-host') ||
            request.headers.get('host') ||
            request.nextUrl.hostname

        // Ignora validação em localhost/desenvolvimento
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:') || hostname.startsWith('127.0.0.1:')) {
            return NextResponse.next()
        }

        try {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

            // Chama endpoint de validação do backend
            const validateRes = await fetch(`${backendUrl}/users/me/validate-tenant?domain=${hostname}`, {
                headers: {
                    Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
                },
            })

            if (!validateRes.ok) {
                // Erro no backend → permite passar (graceful degradation)
                return NextResponse.next()
            }

            const validation = await validateRes.json() as {
                authorized: boolean
                organizationId: string | null
                organizationName: string | null
            }

            // Se não autorizado → redireciona para página de acesso negado
            if (!validation.authorized) {
                const unauthorizedUrl = new URL('/unauthorized', request.url)
                unauthorizedUrl.searchParams.set('domain', hostname)
                return NextResponse.redirect(unauthorizedUrl)
            }

            // Usuário autorizado → adiciona organizationId no header (opcional, para uso no app)
            const response = NextResponse.next()
            if (validation.organizationId) {
                response.headers.set('X-Organization-Id', validation.organizationId)
            }
            return response

        } catch (error) {
            // Erro na validação → permite passar (graceful degradation)
            console.error('[middleware] Erro ao validar tenant:', error)
            return NextResponse.next()
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        // Aplica em todas as rotas exceto arquivos estáticos e API interna do Next.js
        '/((?!_next/static|_next/image|favicon.ico|placeholder.svg).*)',
    ],
}
