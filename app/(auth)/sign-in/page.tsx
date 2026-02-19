'use client'

import { useEffect, useState, Suspense } from 'react'
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

type Status = 'loading' | 'no-org' | 'ready'
type AuthMethod = 'password' | 'magic-link' | 'otp'
type OtpStep = 'email' | 'code'

interface Organization {
    id: string
    name: string
    slug: string | null
    logo: string | null
    authSideImage?: string | null
    authBg?: string | null
}

function SignInPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/dashboard'
    const [status, setStatus] = useState<Status>('loading')
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [detectedDomain, setDetectedDomain] = useState('')
    const [authMethod, setAuthMethod] = useState<AuthMethod>('password')
    const [otpStep, setOtpStep] = useState<OtpStep>('email')
    const [otpEmail, setOtpEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

    // ── Auto-detecta o domínio e busca a organização ──────────────────────────
    useEffect(() => {
        const hostname = window.location.hostname

        setDetectedDomain(hostname)

        api.get('/organizations/check-domain', { params: { domain: hostname } })
            .then(({ data }) => {
                if (data.exists) {
                    setOrganization(data.organization)
                    setStatus('ready')
                } else {
                    setStatus('no-org')
                }
            })
            .catch(() => {
                setStatus('no-org')
            })
    }, [])

    // ── Vincula usuário à org do domínio após login ───────────────────────────
    async function joinOrgAfterLogin() {
        if (!organization) return
        try {
            await api.post(`/organizations/${organization.id}/join`)
        } catch {
            // Se falhar (já é membro, org não existe etc.) não interrompe o fluxo
        }
    }

    // ── Reenviar verificação de e-mail ────────────────────────────────────────
    async function handleResendVerification() {
        if (!unverifiedEmail) return
        const callbackURL = organization ? `/join-org?orgId=${organization.id}` : '/'
        setSubmitting(true)
        try {
            await api.post('/auth/send-verification-email', {
                email: unverifiedEmail,
                callbackURL,
            })
            toast.success('E-mail de verificação reenviado! Verifique sua caixa de entrada.')
        } catch {
            toast.error('Erro ao reenviar. Tente novamente.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Login com e-mail + senha ───────────────────────────────────────────────
    async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value

        setUnverifiedEmail(null)
        setSubmitting(true)
        try {
            await api.post('/auth/sign-in/email', { email, password })
            await joinOrgAfterLogin()
            toast.success('Login realizado com sucesso!')
            router.push(redirectTo)
        } catch (err) {
            const message = err instanceof Error ? err.message : ''
            // Better Auth retorna erro específico quando o e-mail não foi verificado
            if (message.toLowerCase().includes('verif') || message.toLowerCase().includes('email not')) {
                setUnverifiedEmail(email)
            } else {
                toast.error(message || 'E-mail ou senha inválidos.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    // ── Magic Link ────────────────────────────────────────────────────────────
    async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value

        // callbackURL: após verificar o link, vincula à org e redireciona para /
        const callbackURL = organization
            ? `/join-org?orgId=${organization.id}`
            : '/'

        setSubmitting(true)
        try {
            await api.post('/auth/sign-in/magic-link', { email, callbackURL })
            toast.success('Link enviado! Verifique seu e-mail.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao enviar o link.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── OTP: enviar código ────────────────────────────────────────────────────
    async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value

        setSubmitting(true)
        try {
            await api.post('/auth/email-otp/send-verification-otp', {
                email,
                type: 'sign-in',
            })
            setOtpEmail(email)
            setOtpStep('code')
            toast.success('Código enviado! Verifique seu e-mail.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao enviar o código.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── OTP: verificar código ─────────────────────────────────────────────────
    async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const otp = (e.currentTarget.elements.namedItem('otp') as HTMLInputElement).value

        setSubmitting(true)
        try {
            await api.post('/auth/sign-in/email-otp', { email: otpEmail, otp })
            await joinOrgAfterLogin()
            toast.success('Login realizado com sucesso!')
            router.push(redirectTo)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Código inválido ou expirado.')
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

                            {/* ── Sem organização ── */}
                            {status === 'no-org' && (
                                <div className="p-6 md:p-8">
                                    <FieldGroup>
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <h1 className="text-2xl font-bold">Acesso não encontrado</h1>
                                            <p className="text-muted-foreground text-balance">
                                                Nenhuma empresa cadastrada para <strong>{detectedDomain}</strong>.
                                            </p>
                                        </div>
                                        <FieldDescription className="text-center">
                                            <a href="/sign-up">Cadastrar minha empresa</a>
                                        </FieldDescription>
                                    </FieldGroup>
                                </div>
                            )}

                            {/* ── Formulário de login ── */}
                            {status === 'ready' && (
                                <div className="p-6 md:p-8">
                                    <FieldGroup>
                                        {/* Cabeçalho com logo/nome da org */}
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            {organization?.logo && (
                                                <img
                                                    src={organization.logo}
                                                    alt={organization.name}
                                                    className="h-10 w-auto mb-1"
                                                />
                                            )}
                                            <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
                                            <p className="text-muted-foreground text-balance">
                                                {organization?.name ?? detectedDomain}
                                            </p>
                                        </div>

                                        {/* Seletor de método */}
                                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setAuthMethod('password')}
                                                className={`rounded-md px-2 py-1.5 font-medium transition-colors ${authMethod === 'password' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Senha
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setAuthMethod('magic-link') }}
                                                className={`rounded-md px-2 py-1.5 font-medium transition-colors ${authMethod === 'magic-link' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Link mágico
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setAuthMethod('otp'); setOtpStep('email') }}
                                                className={`rounded-md px-2 py-1.5 font-medium transition-colors ${authMethod === 'otp' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Código
                                            </button>
                                        </div>

                                        {/* ── Banner: e-mail não verificado ── */}
                                        {unverifiedEmail && (
                                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950">
                                                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                                    E-mail não verificado
                                                </p>
                                                <p className="mt-1 text-yellow-700 dark:text-yellow-300">
                                                    Confirme seu e-mail <strong>{unverifiedEmail}</strong> para acessar.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleResendVerification}
                                                    disabled={submitting}
                                                    className="mt-3 text-sm font-medium underline underline-offset-2 text-yellow-800 dark:text-yellow-200 disabled:opacity-50"
                                                >
                                                    {submitting ? 'Enviando...' : 'Reenviar e-mail de verificação'}
                                                </button>
                                            </div>
                                        )}

                                        {/* ── Método: Senha ── */}
                                        {authMethod === 'password' && (
                                            <form onSubmit={handlePasswordLogin}>
                                                <FieldGroup>
                                                    <Field>
                                                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                                        <Input id="email" type="email" placeholder="voce@exemplo.com" required />
                                                    </Field>
                                                    <Field>
                                                        <div className="flex items-center">
                                                            <FieldLabel htmlFor="password">Senha</FieldLabel>
                                                            <a href="/forgot-password" className="ml-auto text-sm underline-offset-2 hover:underline">
                                                                Esqueceu?
                                                            </a>
                                                        </div>
                                                        <Input id="password" type="password" required />
                                                    </Field>
                                                    <Field>
                                                        <Button type="submit" disabled={submitting}>
                                                            {submitting ? 'Entrando...' : 'Entrar'}
                                                        </Button>
                                                    </Field>
                                                </FieldGroup>
                                            </form>
                                        )}

                                        {/* ── Método: Magic Link ── */}
                                        {authMethod === 'magic-link' && (
                                            <form onSubmit={handleMagicLink}>
                                                <FieldGroup>
                                                    <Field>
                                                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                                        <Input id="email" type="email" placeholder="voce@exemplo.com" required />
                                                    </Field>
                                                    <Field>
                                                        <Button type="submit" disabled={submitting}>
                                                            {submitting ? 'Enviando...' : 'Enviar link de acesso'}
                                                        </Button>
                                                    </Field>
                                                    <FieldDescription className="text-center text-xs">
                                                        Você receberá um link no e-mail para entrar sem senha.
                                                    </FieldDescription>
                                                </FieldGroup>
                                            </form>
                                        )}

                                        {/* ── Método: OTP (passo 1 — e-mail) ── */}
                                        {authMethod === 'otp' && otpStep === 'email' && (
                                            <form onSubmit={handleSendOtp}>
                                                <FieldGroup>
                                                    <Field>
                                                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                                        <Input id="email" type="email" placeholder="voce@exemplo.com" required />
                                                    </Field>
                                                    <Field>
                                                        <Button type="submit" disabled={submitting}>
                                                            {submitting ? 'Enviando...' : 'Enviar código'}
                                                        </Button>
                                                    </Field>
                                                    <FieldDescription className="text-center text-xs">
                                                        Você receberá um código de 6 dígitos no e-mail.
                                                    </FieldDescription>
                                                </FieldGroup>
                                            </form>
                                        )}

                                        {/* ── Método: OTP (passo 2 — código) ── */}
                                        {authMethod === 'otp' && otpStep === 'code' && (
                                            <form onSubmit={handleVerifyOtp}>
                                                <FieldGroup>
                                                    <Field>
                                                        <FieldLabel htmlFor="otp">Código de verificação</FieldLabel>
                                                        <Input
                                                            id="otp"
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]{6}"
                                                            maxLength={6}
                                                            placeholder="000000"
                                                            className="text-center text-2xl tracking-widest"
                                                            required
                                                        />
                                                        <FieldDescription className="text-xs">
                                                            Código enviado para <strong>{otpEmail}</strong>
                                                        </FieldDescription>
                                                    </Field>
                                                    <Field>
                                                        <Button type="submit" disabled={submitting}>
                                                            {submitting ? 'Verificando...' : 'Verificar código'}
                                                        </Button>
                                                    </Field>
                                                    <FieldDescription className="text-center">
                                                        <button
                                                            type="button"
                                                            className="underline text-sm"
                                                            onClick={() => setOtpStep('email')}
                                                        >
                                                            Usar outro e-mail
                                                        </button>
                                                    </FieldDescription>
                                                </FieldGroup>
                                            </form>
                                        )}

                                        <FieldDescription className="text-center">
                                            Não tem uma conta? <a href="/sign-up">Cadastre-se</a>
                                        </FieldDescription>
                                    </FieldGroup>
                                </div>
                            )}

                            {effectiveSideImage && (
                                <div className="bg-muted relative hidden md:block">
                                    <img
                                        src={effectiveSideImage}
                                        alt=""
                                        className={`absolute inset-0 h-full w-full ${effectiveSideFit === 'contain' ? 'object-contain' : effectiveSideFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                                    />
                                </div>
                            )}
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

export default function SignInPage() {
    return (
        <Suspense>
            <SignInPageInner />
        </Suspense>
    )
}
