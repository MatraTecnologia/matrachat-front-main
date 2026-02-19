'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

// Esta página é chamada após a verificação de e-mail.
// Better Auth redireciona para cá com ?orgId=XXX via callbackURL.
// Ela vincula o usuário autenticado à organização e redireciona para /.
function JoinOrgPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const orgId = searchParams.get('orgId')
        if (!orgId) {
            router.replace('/dashboard')
            return
        }

        api.post(`/organizations/${orgId}/join`)
            .catch(() => { /* já é membro ou org não existe — tudo bem */ })
            .finally(() => {
                router.replace('/dashboard')
            })
    }, [])

    return (
        <div className="flex min-h-svh items-center justify-center">
            <p className="text-muted-foreground text-sm">Vinculando sua conta à empresa...</p>
        </div>
    )
}

export default function JoinOrgPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-svh items-center justify-center">
                <p className="text-muted-foreground text-sm">Vinculando sua conta à empresa...</p>
            </div>
        }>
            <JoinOrgPageInner />
        </Suspense>
    )
}
