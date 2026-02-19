'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
    FlaskConical, Copy, Check, Play, RefreshCw, Loader2,
    CheckCircle2, XCircle, AlertTriangle, Globe, Wifi,
    User, ChevronRight, ExternalLink, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiChannel = {
    id: string
    name: string
    type: 'api'
    status: string
    config?: { apiKey?: string }
}

type EndpointResult = {
    status: 'idle' | 'loading' | 'ok' | 'error'
    label: string
    text: string
}

type StoredSession = {
    contactId: string
    name: string
} | null

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ value, className }: { value: string; className?: string }) {
    const [copied, setCopied] = useState(false)
    function copy() {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={copy}
            className={cn(
                'flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors',
                className
            )}
        >
            {copied
                ? <><Check className="h-3 w-3 text-green-600" /> Copiado</>
                : <><Copy className="h-3 w-3" /> Copiar</>
            }
        </button>
    )
}

// ─── ResultBadge ──────────────────────────────────────────────────────────────

function ResultBadge({ status }: { status: EndpointResult['status'] }) {
    if (status === 'idle')    return <Badge variant="secondary">Aguardando</Badge>
    if (status === 'loading') return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Testando…</Badge>
    if (status === 'ok')      return <Badge className="bg-green-100 text-green-700 border-green-200">✓ OK</Badge>
    return <Badge className="bg-red-100 text-red-700 border-red-200">✗ Erro</Badge>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
    // ── Config state ──────────────────────────────────────────────────────────
    const [apiChannels, setApiChannels] = useState<ApiChannel[]>([])
    const [apiKey,    setApiKey]    = useState('')
    const [apiBase,   setApiBase]   = useState(API_URL)
    const [color,     setColor]     = useState('#6366f1')
    const [agentName, setAgentName] = useState('Suporte')
    const [welcome,   setWelcome]   = useState('Olá! Como posso ajudar?')
    const [position,  setPosition]  = useState<'left' | 'right'>('right')

    // ── Widget state ──────────────────────────────────────────────────────────
    const [widgetStatus, setWidgetStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
    const scriptRef = useRef<HTMLScriptElement | null>(null)

    // ── Session state (localStorage) ──────────────────────────────────────────
    const [session, setSession] = useState<StoredSession>(null)

    // ── Endpoint results ──────────────────────────────────────────────────────
    const [results, setResults] = useState<Record<string, EndpointResult>>({
        config: { status: 'idle', label: 'GET /widget/config', text: '' },
        static: { status: 'idle', label: 'GET /static/widget.js', text: '' },
        cors:   { status: 'idle', label: 'CORS preflight (Access-Control-Allow-Origin)', text: '' },
        sse:    { status: 'idle', label: 'GET /widget/sse/:contactId (SSE)', text: '' },
    })

    // ── Snippet ───────────────────────────────────────────────────────────────
    const snippet = `<script
  src="${apiBase}/static/widget.js"
  data-api-key="${apiKey}"
  data-primary-color="${color}"
  data-agent-name="${agentName}"
  data-welcome-text="${welcome}"
  data-position="${position}"
  data-api-base="${apiBase}"
  defer
></script>`

    // ── Read session from localStorage ────────────────────────────────────────
    const readSession = useCallback((key: string) => {
        if (!key) { setSession(null); return }
        try {
            const stored = JSON.parse(localStorage.getItem('matrachat_v1_' + key) || 'null')
            setSession(stored)
        } catch {
            setSession(null)
        }
    }, [])

    useEffect(() => { readSession(apiKey) }, [apiKey, readSession])

    // Poll localStorage every 2s to detect when widget creates a session
    useEffect(() => {
        if (!apiKey) return
        const id = setInterval(() => readSession(apiKey), 2000)
        return () => clearInterval(id)
    }, [apiKey, readSession])

    // ── Load API channels for quick-fill ──────────────────────────────────────
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => {
                if (!Array.isArray(data) || !data[0]) return
                return api.get('/channels')
            })
            .then((res) => {
                if (!res) return
                const all = res.data as ApiChannel[]
                const apis = all.filter((c) => c.type === 'api')
                setApiChannels(apis)
                if (apis.length > 0 && apis[0].config?.apiKey) {
                    setApiKey(apis[0].config.apiKey)
                }
            })
            .catch(() => null)
    }, [])

    // ── Load widget ───────────────────────────────────────────────────────────
    function loadWidget() {
        if (!apiKey.trim()) return

        // Remove previous widget elements
        document.getElementById('mc-bubble')?.remove()
        document.getElementById('mc-widget')?.remove()
        document.querySelectorAll('style[data-mc]').forEach((s) => s.remove())

        // Remove previous script
        scriptRef.current?.remove()

        const script = document.createElement('script')
        script.id = 'mc-script-test'
        script.src = `${apiBase}/static/widget.js`
        script.setAttribute('data-api-key', apiKey)
        script.setAttribute('data-primary-color', color)
        script.setAttribute('data-agent-name', agentName)
        script.setAttribute('data-welcome-text', welcome)
        script.setAttribute('data-position', position)
        script.setAttribute('data-api-base', apiBase)
        script.defer = true

        setWidgetStatus('loading')

        script.onload = () => { setWidgetStatus('ok'); readSession(apiKey) }
        script.onerror = () => setWidgetStatus('error')

        document.head.appendChild(script)
        scriptRef.current = script
    }

    // ── Clear session ─────────────────────────────────────────────────────────
    function clearSession() {
        if (!apiKey) return
        localStorage.removeItem('matrachat_v1_' + apiKey)
        setSession(null)
        // Remove widget from page so user can test fresh session
        document.getElementById('mc-bubble')?.remove()
        document.getElementById('mc-widget')?.remove()
        setWidgetStatus('idle')
        scriptRef.current?.remove()
        scriptRef.current = null
    }

    // ── Open widget in new blank window ───────────────────────────────────────
    function openInNewWindow() {
        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Teste do Widget — MatraChat</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f5f5f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { text-align: center; color: #555; }
    h2 { margin: 0 0 8px; font-size: 20px; color: #222; }
    p { margin: 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Página de Teste do Widget</h2>
    <p>Clique no botão flutuante no canto ${position === 'right' ? 'inferior direito' : 'inferior esquerdo'} para abrir o chat.</p>
  </div>
  <script
    src="${apiBase}/static/widget.js"
    data-api-key="${apiKey}"
    data-primary-color="${color}"
    data-agent-name="${agentName}"
    data-welcome-text="${welcome}"
    data-position="${position}"
    data-api-base="${apiBase}"
    defer
  ></script>
</body>
</html>`
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
    }

    // ── Test endpoint ─────────────────────────────────────────────────────────
    async function testEndpoint(key: string) {
        setResults((r) => ({ ...r, [key]: { ...r[key], status: 'loading', text: '' } }))
        try {
            let text = ''
            let ok = false

            if (key === 'config') {
                const res = await fetch(`${apiBase}/widget/config`, { headers: { 'X-Widget-Key': apiKey } })
                ok = res.ok
                const body = await res.text()
                try { text = `Status: ${res.status}\n\n${JSON.stringify(JSON.parse(body), null, 2)}` }
                catch { text = `Status: ${res.status}\n\n${body}` }
            } else if (key === 'static') {
                const res = await fetch(`${apiBase}/static/widget.js`)
                ok = res.ok
                const body = await res.text()
                text = `Status: ${res.status}\nContent-Type: ${res.headers.get('content-type')}\n\n${body.slice(0, 500)}…\n\n[${body.length} bytes total]`
            } else if (key === 'cors') {
                const res = await fetch(`${apiBase}/widget/config`, {
                    method: 'OPTIONS',
                    headers: { Origin: 'https://site-externo.com', 'Access-Control-Request-Method': 'GET' },
                })
                const acao = res.headers.get('access-control-allow-origin')
                ok = res.status < 400
                text = `Status: ${res.status}\nAccess-Control-Allow-Origin: ${acao ?? '(ausente)'}\n\n${acao ? '✅ CORS configurado corretamente' : '⚠ CORS pode não estar configurado'}`
            } else if (key === 'sse') {
                if (!session?.contactId) {
                    text = '⚠ Inicie uma sessão primeiro (carregue o widget e preencha o formulário)\npara que o contactId esteja disponível.'
                    setResults((r) => ({ ...r, [key]: { ...r[key], status: 'error', text } }))
                    return
                }
                // Try to connect to SSE and read the first event
                const url = `${apiBase}/widget/sse/${session.contactId}?key=${encodeURIComponent(apiKey)}`
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 3000)
                try {
                    const res = await fetch(url, { signal: controller.signal })
                    clearTimeout(timeout)
                    ok = res.ok
                    text = `Status: ${res.status}\nContent-Type: ${res.headers.get('content-type')}\nAccess-Control-Allow-Origin: ${res.headers.get('access-control-allow-origin')}\n\n✅ SSE conectado — stream ativo`
                } catch (err: unknown) {
                    clearTimeout(timeout)
                    if (err instanceof Error && err.name === 'AbortError') {
                        // Timeout means SSE is streaming (expected behavior)
                        ok = true
                        text = `✅ SSE conectado — stream ativo (conexão interrompida após 3s de timeout esperado)`
                    } else {
                        throw err
                    }
                }
            }

            setResults((r) => ({
                ...r,
                [key]: { ...r[key], status: ok ? 'ok' : 'error', text },
            }))
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            setResults((r) => ({
                ...r,
                [key]: { ...r[key], status: 'error', text: `Erro de rede: ${msg}\n\nVerifique se o backend está em ${apiBase}` },
            }))
        }
    }

    async function testAll() {
        await testEndpoint('static')
        await testEndpoint('config')
        await testEndpoint('cors')
        if (session?.contactId) await testEndpoint('sse')
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                        <FlaskConical className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Teste do Widget</h1>
                        <p className="text-sm text-muted-foreground">Carregue e teste o widget de chat em tempo real</p>
                    </div>
                </div>
                <Button onClick={testAll} variant="outline" size="sm">
                    <Wifi className="mr-2 h-4 w-4" />
                    Testar todos endpoints
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-6 py-6 max-w-4xl space-y-6">

                    {/* ── Configuração ── */}
                    <section className="rounded-xl border bg-card p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-sm">1. Configuração</h2>
                            {apiChannels.length > 0 && (
                                <div className="flex gap-1.5 ml-auto flex-wrap">
                                    {apiChannels.map((ch) => (
                                        <button
                                            key={ch.id}
                                            onClick={() => {
                                                if (ch.config?.apiKey) setApiKey(ch.config.apiKey)
                                            }}
                                            className={cn(
                                                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                                                apiKey === ch.config?.apiKey
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'hover:bg-muted text-muted-foreground'
                                            )}
                                        >
                                            <Globe className="inline h-2.5 w-2.5 mr-1" />
                                            {ch.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">API Key do canal</Label>
                                <Input
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole aqui ou selecione o canal acima"
                                    className="font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Backend URL</Label>
                                <Input
                                    value={apiBase}
                                    onChange={(e) => setApiBase(e.target.value.replace(/\/$/, ''))}
                                    placeholder="http://localhost:3333"
                                    className="font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Nome do atendente</Label>
                                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Mensagem de boas-vindas</Label>
                                <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Cor principal</Label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
                                    />
                                    <Input
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Posição do botão</Label>
                                <div className="flex gap-2">
                                    {(['right', 'left'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPosition(p)}
                                            className={cn(
                                                'flex-1 rounded-lg border py-2 text-sm transition-colors',
                                                position === p
                                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                                    : 'border-input hover:bg-muted text-muted-foreground'
                                            )}
                                        >
                                            {p === 'right' ? '→ Direita' : '← Esquerda'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Load button + status */}
                        <div className="flex items-center gap-3 pt-1 flex-wrap">
                            <Button
                                onClick={loadWidget}
                                disabled={!apiKey.trim() || widgetStatus === 'loading'}
                                className="gap-2"
                            >
                                {widgetStatus === 'loading'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Play className="h-4 w-4" />
                                }
                                Carregar Widget
                            </Button>

                            <Button
                                variant="outline"
                                onClick={openInNewWindow}
                                disabled={!apiKey.trim()}
                                className="gap-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir em nova janela
                            </Button>

                            {widgetStatus === 'ok' && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Widget carregado! Veja o botão no canto {position === 'right' ? 'direito' : 'esquerdo'}.
                                </span>
                            )}
                            {widgetStatus === 'error' && (
                                <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                                    <XCircle className="h-4 w-4" />
                                    Falha ao carregar. Verifique se o backend está rodando.
                                </span>
                            )}
                        </div>
                    </section>

                    {/* ── Sessão Ativa ── */}
                    <section className="rounded-xl border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-sm">2. Sessão do visitante (localStorage)</h2>
                            {session && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearSession}
                                    className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Limpar sessão
                                </Button>
                            )}
                        </div>

                        {!apiKey.trim() ? (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Configure a API Key acima para ver o status da sessão
                            </p>
                        ) : session ? (
                            <div className="rounded-lg border bg-green-50 border-green-200 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span className="text-sm font-medium">Sessão ativa encontrada</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5 text-xs text-green-800">
                                    <div className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                        <span className="font-medium">Nome:</span>
                                        <span>{session.name}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <ChevronRight className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                        <span className="font-medium">Contact ID:</span>
                                        <span className="font-mono break-all">{session.contactId}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-green-700 mt-1">
                                    Ao recarregar a página, o widget pula o formulário e vai direto para o histórico de mensagens.
                                    Clique em <strong>Limpar sessão</strong> para testar um novo visitante.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border bg-muted/40 p-4">
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                    Nenhuma sessão salva para esta API key.
                                    Carregue o widget e preencha o formulário para criar uma.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* ── Snippet ── */}
                    <section className="rounded-xl border bg-card p-5 space-y-3">
                        <h2 className="font-semibold text-sm">3. Snippet de instalação</h2>
                        <p className="text-xs text-muted-foreground">
                            Cole este código antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> do seu site.
                        </p>
                        <div className="relative">
                            <Textarea
                                readOnly
                                value={snippet}
                                rows={9}
                                className="font-mono text-xs resize-none bg-muted pr-20"
                            />
                            <CopyButton value={snippet} className="absolute top-2 right-2" />
                        </div>
                    </section>

                    {/* ── Botões rápidos ── */}
                    <section className="rounded-xl border bg-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-sm">4. Botões rápidos — Endpoints</h2>
                            <Button variant="outline" size="sm" onClick={testAll}>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Testar todos
                            </Button>
                        </div>

                        <div className="grid gap-3">
                            {(Object.entries(results) as [string, EndpointResult][]).map(([key, r]) => (
                                <div key={key} className="rounded-lg border bg-background">
                                    {/* Row header */}
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <code className="flex-1 text-xs font-mono text-foreground">{r.label}</code>
                                        <ResultBadge status={r.status} />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-3 text-xs"
                                            onClick={() => testEndpoint(key)}
                                            disabled={
                                                r.status === 'loading' ||
                                                (key === 'config' && !apiKey.trim()) ||
                                                (key === 'sse' && !apiKey.trim())
                                            }
                                        >
                                            {r.status === 'loading'
                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : <Play className="h-3 w-3" />
                                            }
                                        </Button>
                                    </div>

                                    {/* Hint for SSE test */}
                                    {key === 'sse' && !session?.contactId && r.status === 'idle' && (
                                        <div className="border-t px-4 py-2">
                                            <p className="text-[11px] text-muted-foreground">
                                                Inicie uma sessão (carregue o widget e preencha o formulário) para habilitar este teste.
                                            </p>
                                        </div>
                                    )}

                                    {/* Result */}
                                    {r.text && (
                                        <div className="border-t">
                                            <pre className={cn(
                                                'px-4 py-3 text-[11px] font-mono whitespace-pre-wrap break-all rounded-b-lg',
                                                r.status === 'ok'    ? 'bg-green-50 text-green-900' :
                                                r.status === 'error' ? 'bg-red-50 text-red-900' :
                                                'bg-muted text-foreground'
                                            )}>
                                                {r.text}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!apiKey.trim() && (
                            <p className="flex items-center gap-1.5 text-xs text-amber-600">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Preencha a API Key para testar os endpoints autenticados
                            </p>
                        )}
                    </section>

                    {/* ── Fluxo de teste ── */}
                    <section className="rounded-xl border bg-card p-5 space-y-3">
                        <h2 className="font-semibold text-sm">5. Fluxo de teste ponta a ponta</h2>
                        <ol className="space-y-2 text-sm text-muted-foreground">
                            {[
                                'Selecione um canal API acima (ou cole a API key manualmente)',
                                'Clique em "Testar todos endpoints" para validar a conexão com o backend',
                                <>Clique em <strong>Carregar Widget</strong> ou <strong>Abrir em nova janela</strong> — um botão flutuante aparecerá</>,
                                'Clique no botão flutuante, preencha nome e e-mail e clique em "Iniciar conversa"',
                                'A sessão aparecerá na seção "Sessão do visitante" acima',
                                'Digite uma mensagem e envie',
                                <>No painel admin, vá em <strong>Conversas</strong> — o contato deve aparecer</>,
                                'Clique no contato e responda pelo painel admin',
                                'A resposta deve aparecer em tempo real no widget (via SSE)',
                                'Recarregue a página — o widget pula o formulário e carrega o histórico automaticamente',
                                'Clique em "Limpar sessão" para simular um novo visitante',
                            ].map((step, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                                        {i + 1}
                                    </span>
                                    <span className="leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </section>

                </div>
            </ScrollArea>
        </div>
    )
}
