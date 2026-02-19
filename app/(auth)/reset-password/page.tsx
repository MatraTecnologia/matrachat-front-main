'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [submitting, setSubmitting] = useState(false)

    if (!token) {
        return (
            <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Link inválido</h1>
                    <p className="text-muted-foreground text-balance">
                        Este link de redefinição de senha é inválido ou expirou.
                    </p>
                </div>
                <FieldDescription className="text-center">
                    <a href="/forgot-password">Solicitar novo link</a>
                </FieldDescription>
            </FieldGroup>
        )
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value
        const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem.')
            return
        }

        if (newPassword.length < 8) {
            toast.error('A senha deve ter no mínimo 8 caracteres.')
            return
        }

        setSubmitting(true)
        try {
            // Better Auth: POST /auth/reset-password
            await api.post('/auth/reset-password', { newPassword, token })
            toast.success('Senha redefinida com sucesso!')
            router.push('/sign-in')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Link inválido ou expirado.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Nova senha</h1>
                    <p className="text-muted-foreground text-balance">
                        Crie uma senha segura para sua conta.
                    </p>
                </div>
                <Field>
                    <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
                    <Input
                        id="newPassword"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        minLength={8}
                        required
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirmar senha</FieldLabel>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repita a senha"
                        minLength={8}
                        required
                    />
                </Field>
                <Field>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Salvando...' : 'Redefinir senha'}
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Card className="overflow-hidden">
                    <CardContent className="p-6 md:p-8">
                        <Suspense fallback={<p className="text-muted-foreground text-sm text-center">Carregando...</p>}>
                            <ResetPasswordForm />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
