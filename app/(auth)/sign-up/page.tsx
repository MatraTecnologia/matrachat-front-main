'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

type Status = 'loading' | 'no-org' | 'create-org' | 'register'

interface Organization {
    id: string
    name: string
    slug: string | null
    logo: string | null
    authSideImage?: string | null
    authBg?: string | null
}

export default function SignUpPage() {
    const router = useRouter()
    const [status, setStatus] = useState<Status>('loading')
    const [submitting, setSubmitting] = useState(false)
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [detectedDomain, setDetectedDomain] = useState('')
    const [email, setEmail] = useState('')

    // ── Detecta o domínio automaticamente e busca a organização ──────────────
    useEffect(() => {
        const hostname = window.location.hostname  // ex: empresa.matrachat.com ou empresa.com.br

        setDetectedDomain(hostname)

        api.get('/organizations/check-domain', { params: { domain: hostname } })
            .then(({ data }) => {
                if (data.exists) {
                    setOrganization(data.organization)
                    setStatus('register')
                } else {
                    setStatus('no-org')
                }
            })
            .catch(() => {
                setStatus('no-org')
            })
    }, [])

    // ── Cadastrar organização (domínio sem tenant cadastrado) ─────────────────
    async function handleCreateOrg(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const orgName = (e.currentTarget.elements.namedItem('orgName') as HTMLInputElement).value

        setSubmitting(true)
        try {
            await api.post('/organizations/public', { name: orgName, domain: detectedDomain })
            toast.success('Empresa cadastrada! Agora crie seu acesso.')
            const { data } = await api.get('/organizations/check-domain', { params: { domain: detectedDomain } })
            setOrganization(data.organization)
            setStatus('register')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar empresa.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Criar conta ───────────────────────────────────────────────────────────
    async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const name = (form.elements.namedItem('name') as HTMLInputElement).value
        const emailValue = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value

        // Verificar se e-mail já é membro desta organização
        if (organization) {
            try {
                const { data } = await api.get('/organizations/check-member', {
                    params: { email: emailValue, orgId: organization.id },
                })
                if (data.isMember) {
                    toast.error('Este e-mail já está cadastrado nesta empresa. Faça login.')
                    return
                }
                if (data.userExists) {
                    toast.error('Este e-mail já possui uma conta. Faça login para acessar esta empresa.')
                    return
                }
            } catch {
                // Se falhar a checagem, deixa prosseguir (o backend vai rejeitar se necessário)
            }
        }

        setEmail(emailValue)
        setSubmitting(true)
        try {
            // callbackURL: após verificar e-mail, redireciona para /join-org?orgId=XXX
            // para vincular automaticamente o usuário à organização
            const callbackURL = organization
                ? `/join-org?orgId=${organization.id}`
                : '/'

            await api.post('/auth/sign-up/email', { name, email: emailValue, password, callbackURL })
            toast.success('Conta criada! Verifique seu e-mail para ativar o acesso.')
            router.push('/sign-in')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao criar conta.')
        } finally {
            setSubmitting(false)
        }
    }

    const cached = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('matrachat.appearance') || '{}')
        : {}
    const effectiveBg = organization?.authBg || cached.authBg || ''
    const effectiveSideImage = organization?.authSideImage || cached.authSideImage || ''
    const effectiveSideFit = (cached.authSideFit as 'contain' | 'cover' | 'fill') || 'cover'
    const bgStyle = effectiveBg ? { backgroundColor: effectiveBg } : undefined

    return (
        <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-muted" style={bgStyle}>
            <div className="w-full max-w-sm md:max-w-4xl">
                <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">

                            {/* ── Carregando ── */}
                            {status === 'loading' && (
                                <div className="p-6 md:p-8 flex items-center justify-center">
                                    <p className="text-muted-foreground text-sm">Verificando organização...</p>
                                </div>
                            )}

                            {/* ── Domínio sem organização cadastrada ── */}
                            {status === 'no-org' && (
                                <div className="p-6 md:p-8">
                                    <FieldGroup>
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <h1 className="text-2xl font-bold">Acesso não encontrado</h1>
                                            <p className="text-muted-foreground text-balance">
                                                Nenhuma empresa cadastrada para <strong>{detectedDomain}</strong>.
                                            </p>
                                        </div>
                                        <Field>
                                            <Button onClick={() => setStatus('create-org')}>
                                                Cadastrar minha empresa
                                            </Button>
                                        </Field>
                                        <FieldDescription className="text-center">
                                            Já tem uma conta? <a href="/sign-in">Entrar</a>
                                        </FieldDescription>
                                    </FieldGroup>
                                </div>
                            )}

                            {/* ── Cadastrar organização ── */}
                            {status === 'create-org' && (
                                <form className="p-6 md:p-8" onSubmit={handleCreateOrg}>
                                    <FieldGroup>
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <h1 className="text-2xl font-bold">Cadastre sua empresa</h1>
                                            <p className="text-muted-foreground text-balance">
                                                Domínio: <strong>{detectedDomain}</strong>
                                            </p>
                                        </div>
                                        <Field>
                                            <FieldLabel htmlFor="orgName">Nome da empresa</FieldLabel>
                                            <Input id="orgName" type="text" placeholder="Minha Empresa Ltda" required />
                                        </Field>
                                        <Field>
                                            <Button type="submit" disabled={submitting}>
                                                {submitting ? 'Cadastrando...' : 'Cadastrar empresa'}
                                            </Button>
                                        </Field>
                                        <FieldDescription className="text-center">
                                            <button type="button" className="underline" onClick={() => setStatus('no-org')}>
                                                Voltar
                                            </button>
                                        </FieldDescription>
                                    </FieldGroup>
                                </form>
                            )}

                            {/* ── Criar conta (organização encontrada) ── */}
                            {status === 'register' && (
                                <form className="p-6 md:p-8" onSubmit={handleRegister}>
                                    <FieldGroup>
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            {organization?.logo && (
                                                <img src={organization.logo} alt={organization.name} className="h-10 w-auto mb-1" />
                                            )}
                                            <h1 className="text-2xl font-bold">Crie sua conta</h1>
                                            <p className="text-muted-foreground text-balance">
                                                {organization?.name ?? detectedDomain}
                                            </p>
                                        </div>
                                        <Field>
                                            <FieldLabel htmlFor="name">Nome completo</FieldLabel>
                                            <Input id="name" type="text" placeholder="Seu nome" required />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                            <Input id="email" type="email" placeholder="voce@exemplo.com" required />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="password">Senha</FieldLabel>
                                            <Input id="password" type="password" required />
                                        </Field>
                                        <Field>
                                            <Button type="submit" disabled={submitting}>
                                                {submitting ? 'Criando conta...' : 'Criar conta'}
                                            </Button>
                                        </Field>
                                        <FieldDescription className="text-center">
                                            Já tem uma conta? <a href="/sign-in">Entrar</a>
                                        </FieldDescription>
                                    </FieldGroup>
                                </form>
                            )}

                            <div className="bg-muted relative hidden md:block">
                                <img
                                    src={effectiveSideImage || '/placeholder.svg'}
                                    alt=""
                                    className={`absolute inset-0 h-full w-full ${effectiveSideFit === 'contain' ? 'object-contain' : effectiveSideFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <FieldDescription className="px-6 text-center">
                        Ao continuar, você concorda com nossos <a href="#">Termos de Serviço</a>{' '}
                        e <a href="#">Política de Privacidade</a>.
                    </FieldDescription>
                </div>
            </div>
        </div>
    )
}
