'use client'

import { useState } from 'react'
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

export default function ForgotPasswordPage() {
    const [submitting, setSubmitting] = useState(false)
    const [sent, setSent] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value

        setSubmitting(true)
        try {
            // Better Auth: POST /auth/forget-password
            // redirectTo: URL base para onde o link de reset vai apontar
            await api.post('/auth/forget-password', {
                email,
                redirectTo: `${window.location.origin}/reset-password`,
            })
            setSent(true)
            toast.success('E-mail enviado! Verifique sua caixa de entrada.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao enviar o e-mail.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Card className="overflow-hidden">
                    <CardContent className="p-6 md:p-8">
                        {sent ? (
                            <FieldGroup>
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <h1 className="text-2xl font-bold">E-mail enviado!</h1>
                                    <p className="text-muted-foreground text-balance">
                                        Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                                    </p>
                                </div>
                                <FieldDescription className="text-center">
                                    <a href="/sign-in">Voltar ao login</a>
                                </FieldDescription>
                            </FieldGroup>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <FieldGroup>
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <h1 className="text-2xl font-bold">Esqueceu sua senha?</h1>
                                        <p className="text-muted-foreground text-balance">
                                            Informe seu e-mail e enviaremos um link para redefinir sua senha.
                                        </p>
                                    </div>
                                    <Field>
                                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="voce@exemplo.com"
                                            required
                                        />
                                    </Field>
                                    <Field>
                                        <Button type="submit" disabled={submitting}>
                                            {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
                                        </Button>
                                    </Field>
                                    <FieldDescription className="text-center">
                                        Lembrou a senha? <a href="/sign-in">Entrar</a>
                                    </FieldDescription>
                                </FieldGroup>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
