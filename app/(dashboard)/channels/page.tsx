'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    Plus, Globe, MessageCircle, Plug, Trash2, RefreshCw,
    CheckCircle2, XCircle, Loader2, Copy, Check, Wifi, WifiOff, Clock, Settings2, ExternalLink,
    FlaskConical, PlusCircle, Minus, AlertTriangle, Phone,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelType = 'api' | 'whatsapp' | 'whatsapp-business'
type ChannelStatus = 'pending' | 'connecting' | 'connected' | 'disconnected'

type FormField = {
    id: string
    label: string
    type: 'text' | 'email' | 'phone'
    required: boolean
}

const DEFAULT_FORM_FIELDS: FormField[] = [
    { id: 'name',  label: 'Seu nome', type: 'text',  required: true },
    { id: 'email', label: 'E-mail',   type: 'email', required: true },
]

type WidgetConfig = {
    primaryColor: string
    welcomeText: string
    agentName: string
    agentAvatarUrl: string
    position: 'left' | 'right'
    formFields?: FormField[]
}

type Channel = {
    id: string
    name: string
    type: ChannelType
    status: ChannelStatus
    createdAt: string
    config?: {
        apiKey?: string
        instanceName?: string
        evolutionUrl?: string
        phone?: string
        profilePictureUrl?: string
        widgetConfig?: Partial<WidgetConfig>
    }
}

type WizardStep = 'pick-type' | 'api-form' | 'whatsapp-form' | 'whatsapp-business-form' | 'whatsapp-business-oauth-select' | 'whatsapp-qr' | 'done'

// ─── Hook: orgId da sessão ─────────────────────────────────────────────────────

function useOrgId() {
    const [orgId, setOrgId] = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => {
                if (Array.isArray(data) && data.length > 0) {
                    // Em multi-tenant, busca pela organização do domínio atual
                    const currentDomain = window.location.hostname

                    // Tenta encontrar organização que corresponde ao domínio atual
                    const matchingOrg = data.find((org: any) =>
                        org.domain === currentDomain ||
                        org.slug === currentDomain.split('.')[0]
                    )

                    // Se encontrou, usa ela; senão, usa a primeira (fallback)
                    setOrgId(matchingOrg?.id || data[0].id)
                }
            })
            .catch(() => null)
    }, [])
    return orgId
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ChannelStatus) {
    const map: Record<ChannelStatus, { label: string; icon: React.ElementType; className: string }> = {
        connected: { label: 'Conectado', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
        connecting: { label: 'Conectando...', icon: Loader2, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
        disconnected: { label: 'Desconectado', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
        pending: { label: 'Pendente', icon: Clock, className: 'bg-muted text-muted-foreground' },
    }
    const s = map[status]
    const Icon = s.icon
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', s.className)}>
            <Icon className={cn('h-3 w-3', status === 'connecting' && 'animate-spin')} />
            {s.label}
        </span>
    )
}

function typeIcon(type: ChannelType) {
    if (type === 'whatsapp') return <MessageCircle className="h-5 w-5 text-green-600" />
    if (type === 'whatsapp-business') return <MessageCircle className="h-5 w-5 text-blue-600" />
    return <Globe className="h-5 w-5 text-blue-600" />
}

function typeLabel(type: ChannelType) {
    if (type === 'whatsapp') return 'WhatsApp (Evolution)'
    if (type === 'whatsapp-business') return 'WhatsApp Business API'
    return 'API Externa'
}

// ─── Copied helper ────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false)
    function copy() {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button onClick={copy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    )
}

// ─── Widget Config Dialog ─────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000'

function WidgetConfigDialog({
    channel,
    open,
    onClose,
    onSaved,
}: {
    channel: Channel
    open: boolean
    onClose: () => void
    onSaved: () => void
}) {
    const wc = channel.config?.widgetConfig ?? {}
    const [primaryColor,   setPrimaryColor]   = useState(wc.primaryColor   ?? '#6366f1')
    const [welcomeText,    setWelcomeText]    = useState(wc.welcomeText    ?? 'Olá! Como posso ajudar?')
    const [agentName,      setAgentName]      = useState(wc.agentName      ?? 'Suporte')
    const [agentAvatarUrl, setAgentAvatarUrl] = useState(wc.agentAvatarUrl ?? '')
    const [position,       setPosition]       = useState<'left' | 'right'>(wc.position ?? 'right')
    const [formFields,     setFormFields]     = useState<FormField[]>(wc.formFields ?? DEFAULT_FORM_FIELDS)
    const [saving,         setSaving]         = useState(false)
    const [copied,         setCopied]         = useState<string | null>(null)

    // Sync form when channel changes
    useEffect(() => {
        const w = channel.config?.widgetConfig ?? {}
        setPrimaryColor(w.primaryColor ?? '#6366f1')
        setWelcomeText(w.welcomeText ?? 'Olá! Como posso ajudar?')
        setAgentName(w.agentName ?? 'Suporte')
        setAgentAvatarUrl(w.agentAvatarUrl ?? '')
        setPosition(w.position ?? 'right')
        setFormFields(w.formFields ?? DEFAULT_FORM_FIELDS)
    }, [channel])

    function updateField(idx: number, patch: Partial<FormField>) {
        setFormFields((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
    }

    function addField() {
        setFormFields((prev) => [...prev, { id: 'campo_' + Date.now(), label: 'Novo campo', type: 'text', required: false }])
    }

    function removeField(idx: number) {
        setFormFields((prev) => prev.filter((_, i) => i !== idx))
    }

    async function save() {
        setSaving(true)
        try {
            await api.patch(`/channels/${channel.id}`, {
                widgetConfig: { primaryColor, welcomeText, agentName, agentAvatarUrl: agentAvatarUrl || null, position, formFields },
            })
            toast.success('Configurações do widget salvas!')
            onSaved()
        } catch {
            toast.error('Erro ao salvar configurações.')
        } finally {
            setSaving(false)
        }
    }

    function copy(value: string, key: string) {
        navigator.clipboard.writeText(value)
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
    }

    const snippet = `<script
  src="${API_URL}/static/widget.js"
  data-api-key="${channel.config?.apiKey ?? ''}"
  data-primary-color="${primaryColor}"
  data-agent-name="${agentName}"
  data-welcome-text="${welcomeText}"
  data-position="${position}"${agentAvatarUrl ? `\n  data-avatar-url="${agentAvatarUrl}"` : ''}
  defer
></script>`

    const iframeSnippet = `<iframe
  src="${FRONTEND_URL}/conversations"
  width="100%"
  height="700"
  style="border:none;border-radius:12px;"
></iframe>`

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Widget — {channel.name}
                    </DialogTitle>
                    <DialogDescription>
                        Configure e instale o widget de chat no seu site.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="snippet" className="mt-1">
                    <TabsList className="w-full">
                        <TabsTrigger value="snippet"  className="flex-1">Instalar</TabsTrigger>
                        <TabsTrigger value="config"   className="flex-1">Personalizar</TabsTrigger>
                        <TabsTrigger value="form"     className="flex-1">Formulário</TabsTrigger>
                        <TabsTrigger value="iframe"   className="flex-1">Iframe</TabsTrigger>
                    </TabsList>

                    {/* ── Snippet tab ── */}
                    <TabsContent value="snippet" className="mt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Cole este código antes do fechamento da tag <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> do seu site.
                        </p>
                        <div className="relative">
                            <Textarea
                                readOnly
                                value={snippet}
                                rows={8}
                                className="font-mono text-xs resize-none bg-muted"
                            />
                            <button
                                onClick={() => copy(snippet, 'snippet')}
                                className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background border px-2 py-1 text-xs hover:bg-muted transition-colors"
                            >
                                {copied === 'snippet'
                                    ? <><Check className="h-3 w-3 text-green-600" /> Copiado</>
                                    : <><Copy className="h-3 w-3" /> Copiar</>
                                }
                            </button>
                        </div>
                    </TabsContent>

                    {/* ── Config tab ── */}
                    <TabsContent value="config" className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Nome do atendente</Label>
                                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Suporte" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Cor principal</Label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
                                    />
                                    <Input
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        placeholder="#6366f1"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Mensagem de boas-vindas</Label>
                            <Input value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} placeholder="Olá! Como posso ajudar?" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>URL do avatar <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                            <Input value={agentAvatarUrl} onChange={(e) => setAgentAvatarUrl(e.target.value)} placeholder="https://exemplo.com/avatar.jpg" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Posição do botão</Label>
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
                                        {p === 'right' ? 'Direita' : 'Esquerda'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button className="w-full" onClick={save} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar configurações
                        </Button>
                    </TabsContent>

                    {/* ── Form tab ── */}
                    <TabsContent value="form" className="mt-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Configure os campos exibidos no formulário antes de iniciar o chat.
                        </p>

                        <div className="space-y-2">
                            {formFields.map((field, idx) => (
                                <div key={field.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                                        <Input
                                            value={field.label}
                                            onChange={(e) => updateField(idx, { label: e.target.value })}
                                            placeholder="Nome do campo"
                                            className="h-7 text-sm"
                                        />
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(idx, { type: e.target.value as FormField['type'] })}
                                                className="h-6 rounded border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                                            >
                                                <option value="text">Texto</option>
                                                <option value="email">E-mail</option>
                                                <option value="phone">Telefone</option>
                                            </select>
                                            <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => updateField(idx, { required: e.target.checked })}
                                                    className="h-3 w-3"
                                                />
                                                Obrigatório
                                            </label>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeField(idx)}
                                        disabled={formFields.length <= 1}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Remover campo"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addField}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-2 text-sm text-primary/70 hover:bg-primary/5 hover:text-primary hover:border-primary transition-colors"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Adicionar campo
                        </button>

                        <Button className="w-full" onClick={save} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar formulário
                        </Button>
                    </TabsContent>

                    {/* ── Iframe tab ── */}
                    <TabsContent value="iframe" className="mt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Use este iframe para embutir o painel de conversas em aplicações internas.
                        </p>
                        <div className="relative">
                            <Textarea
                                readOnly
                                value={iframeSnippet}
                                rows={6}
                                className="font-mono text-xs resize-none bg-muted"
                            />
                            <button
                                onClick={() => copy(iframeSnippet, 'iframe')}
                                className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background border px-2 py-1 text-xs hover:bg-muted transition-colors"
                            >
                                {copied === 'iframe'
                                    ? <><Check className="h-3 w-3 text-green-600" /> Copiado</>
                                    : <><Copy className="h-3 w-3" /> Copiar</>
                                }
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
                            O iframe requer que o usuário esteja autenticado no Matra Chat. Indicado para uso em aplicações internas.
                        </p>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

// ─── Iframe Embed Dialog (WhatsApp) ──────────────────────────────────────────

function IframeEmbedDialog({
    channel,
    open,
    onClose,
}: {
    channel: Channel
    open: boolean
    onClose: () => void
}) {
    const [copied, setCopied] = useState(false)

    const iframeSnippet = `<iframe
  src="${FRONTEND_URL}/conversations"
  width="100%"
  height="700"
  style="border:none;border-radius:12px;"
></iframe>`

    function copy() {
        navigator.clipboard.writeText(iframeSnippet)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                        Embutir painel — {channel.name}
                    </DialogTitle>
                    <DialogDescription>
                        Use este iframe para embutir o painel de conversas em aplicações internas.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 space-y-3">
                    <div className="relative">
                        <Textarea
                            readOnly
                            value={iframeSnippet}
                            rows={6}
                            className="font-mono text-xs resize-none bg-muted"
                        />
                        <button
                            onClick={copy}
                            className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background border px-2 py-1 text-xs hover:bg-muted transition-colors"
                        >
                            {copied
                                ? <><Check className="h-3 w-3 text-green-600" /> Copiado</>
                                : <><Copy className="h-3 w-3" /> Copiar</>
                            }
                        </button>
                    </div>
                    <p className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
                        O iframe requer que o usuário esteja autenticado no Matra Chat. Indicado para uso em aplicações internas.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Webhook Info Card ────────────────────────────────────────────────────────

const WA_EVENTS = [
    'MESSAGES_UPSERT',
    'CONNECTION_UPDATE',
    'LABELS_ASSOCIATION',
    'CONTACTS_UPSERT',
    'CONTACTS_UPDATE',
    'LABELS_EDIT',
]

function WebhookInfoCard() {
    const webhookUrl = `${API_URL}/channels/whatsapp/webhook`
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [copiedEvent, setCopiedEvent] = useState<string | null>(null)

    function copyUrl() {
        navigator.clipboard.writeText(webhookUrl)
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
    }

    function copyEvent(evt: string) {
        navigator.clipboard.writeText(evt)
        setCopiedEvent(evt)
        setTimeout(() => setCopiedEvent(null), 2000)
    }

    return (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-green-700" />
                <span className="text-sm font-semibold text-green-800">Configuração do Webhook</span>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
                Configure o webhook abaixo na sua instância Evolution API para receber mensagens e atualizações em tempo real.
            </p>

            {/* URL */}
            <div className="space-y-1">
                <p className="text-xs font-medium text-green-800">URL do Webhook</p>
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2">
                    <code className="flex-1 truncate font-mono text-xs text-foreground">{webhookUrl}</code>
                    <button
                        onClick={copyUrl}
                        className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar URL"
                    >
                        {copiedUrl
                            ? <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copiado</span></>
                            : <><Copy className="h-3.5 w-3.5" /><span>Copiar</span></>
                        }
                    </button>
                </div>
            </div>

            {/* Events */}
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-green-800">Eventos a ativar</p>
                <div className="flex flex-wrap gap-1.5">
                    {WA_EVENTS.map((evt) => (
                        <button
                            key={evt}
                            onClick={() => copyEvent(evt)}
                            title="Clique para copiar"
                            className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-0.5 font-mono text-[11px] text-green-800 hover:bg-green-100 transition-colors"
                        >
                            {copiedEvent === evt
                                ? <Check className="h-2.5 w-2.5 text-green-600" />
                                : <Copy className="h-2.5 w-2.5 opacity-50" />
                            }
                            {evt}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-green-700 opacity-80">Clique em cada evento para copiar o nome.</p>
            </div>
        </div>
    )
}

// ─── Channel Card ─────────────────────────────────────────────────────────────

function ChannelCard({
    channel,
    onDelete,
    onReconnect,
    onWidgetConfig,
    onEmbedIframe,
    onTest,
}: {
    channel: Channel
    onDelete: (id: string) => void
    onReconnect: (channel: Channel) => void
    onWidgetConfig?: (channel: Channel) => void
    onEmbedIframe?: (channel: Channel) => void
    onTest?: (channel: Channel) => void
}) {
    return (
        <div className="flex items-center gap-4 rounded-xl border bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
            {/* Avatar com foto do perfil ou ícone padrão */}
            <Avatar className="h-12 w-12 shrink-0">
                {channel.config?.profilePictureUrl && (
                    <AvatarImage src={channel.config.profilePictureUrl} alt={channel.name} />
                )}
                <AvatarFallback className="bg-muted">
                    {typeIcon(channel.type)}
                </AvatarFallback>
            </Avatar>

            <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{channel.name}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground shrink-0">{typeLabel(channel.type)}</span>
                </div>

                <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {statusBadge(channel.status)}

                    {/* Telefone */}
                    {channel.config?.phone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <Phone className="h-3 w-3" />
                            {channel.config.phone}
                        </span>
                    ) : (channel.type === 'whatsapp' || channel.type === 'whatsapp-business') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Sem telefone
                        </span>
                    )}

                    {/* API Key */}
                    {channel.type === 'api' && channel.config?.apiKey && (
                        <span className="flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground">
                            {channel.config.apiKey.slice(0, 16)}…
                            <CopyButton value={channel.config.apiKey} />
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {channel.type === 'api' && onTest && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-violet-600"
                        onClick={() => onTest(channel)}
                        title="Testar o widget de chat em uma nova página"
                    >
                        <FlaskConical className="h-4 w-4" />
                    </Button>
                )}
                {channel.type === 'api' && onWidgetConfig && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onWidgetConfig(channel)}
                        title="Configurar aparência e comportamento do widget"
                    >
                        <Settings2 className="h-4 w-4" />
                    </Button>
                )}
                {(channel.type === 'whatsapp' || channel.type === 'whatsapp-business') && onEmbedIframe && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEmbedIframe(channel)}
                        title="Obter código iframe para embutir o painel em seu site"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                )}
                {channel.type === 'whatsapp' && channel.status !== 'connected' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                        onClick={() => onReconnect(channel)}
                        title="Clique para escanear o QR code e reconectar o WhatsApp"
                    >
                        <Wifi className="h-3.5 w-3.5" />
                        Conectar
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(channel.id)}
                    title="Remover este canal permanentemente"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// ─── Add Channel Dialog ───────────────────────────────────────────────────────

function AddChannelDialog({
    open,
    onClose,
    onCreated,
    reconnectChannel,
}: {
    open: boolean
    onClose: () => void
    onCreated: (ch: Channel) => void
    reconnectChannel?: Channel
}) {
    const [step, setStep] = useState<WizardStep>(reconnectChannel ? 'whatsapp-qr' : 'pick-type')

    // API form
    const [apiName, setApiName] = useState('')
    const [apiLoading, setApiLoading] = useState(false)

    // WhatsApp form
    const [waName, setWaName] = useState('')
    const [waUrl, setWaUrl] = useState('')
    const [waKey, setWaKey] = useState('')
    const [waLoading, setWaLoading] = useState(false)
    const [hasDefaultKey, setHasDefaultKey] = useState(false)

    // WhatsApp Business form
    const [wabName, setWabName] = useState('')
    const [wabPhoneNumberId, setWabPhoneNumberId] = useState('')
    const [wabAccessToken, setWabAccessToken] = useState('')
    const [wabWebhookVerifyToken, setWabWebhookVerifyToken] = useState('')
    const [wabBusinessAccountId, setWabBusinessAccountId] = useState('')
    const [wabLoading, setWabLoading] = useState(false)

    // Pré-preenche URL e key com os defaults do servidor (env vars)
    useEffect(() => {
        api.get('/channels/evolution-defaults')
            .then(({ data }) => {
                if (data.evolutionUrl) setWaUrl(data.evolutionUrl)
                if (data.hasDefaultKey) setHasDefaultKey(true)
            })
            .catch(() => null)
    }, [])

    // QR
    const [channelId, setChannelId] = useState(reconnectChannel?.id ?? '')
    const [qrBase64, setQrBase64] = useState<string | null>(null)
    const [qrLoading, setQrLoading] = useState(false)
    const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null)
    const [connected, setConnected] = useState(false)

    function reset() {
        setStep('pick-type')
        setApiName(''); setWaName(''); setWaUrl(''); setWaKey('')
        setWabName(''); setWabPhoneNumberId(''); setWabAccessToken(''); setWabWebhookVerifyToken(''); setWabBusinessAccountId('')
        setQrBase64(null); setConnected(false)
        if (pollInterval) clearInterval(pollInterval)
        setPollInterval(null)
    }

    function handleClose() {
        reset()
        onClose()
    }

    // ── API channel ──────────────────────────────────────────────────────────
    async function createApiChannel() {
        if (!apiName.trim()) return
        setApiLoading(true)
        try {
            const { data } = await api.post('/channels', { name: apiName.trim(), type: 'api' })
            onCreated(data)
            setStep('done')
        } catch {
            toast.error('Erro ao criar canal. Tente novamente.')
        } finally {
            setApiLoading(false)
        }
    }

    // ── WhatsApp channel ─────────────────────────────────────────────────────
    async function createWhatsAppChannel() {
        if (!waName.trim() || !waUrl.trim() || (!waKey.trim() && !hasDefaultKey)) {
            toast.error('Preencha todos os campos.')
            return
        }
        setWaLoading(true)
        try {
            const { data } = await api.post('/channels', {
                name: waName.trim(),
                type: 'whatsapp',
                evolutionUrl: waUrl.trim(),
                evolutionApiKey: waKey.trim(),
            })
            setChannelId(data.id)
            await fetchQrCode(data.id)
            setStep('whatsapp-qr')
        } catch {
            toast.error('Erro ao criar canal. Verifique a URL e API key da Evolution API.')
        } finally {
            setWaLoading(false)
        }
    }

    // ── WhatsApp Business channel ────────────────────────────────────────────
    async function createWhatsAppBusinessChannel() {
        if (!wabName.trim() || !wabPhoneNumberId.trim() || !wabAccessToken.trim() || !wabWebhookVerifyToken.trim()) {
            toast.error('Preencha todos os campos obrigatórios.')
            return
        }
        setWabLoading(true)
        try {
            const { data } = await api.post('/channels', {
                name: wabName.trim(),
                type: 'whatsapp-business',
                phoneNumberId: wabPhoneNumberId.trim(),
                accessToken: wabAccessToken.trim(),
                webhookVerifyToken: wabWebhookVerifyToken.trim(),
                businessAccountId: wabBusinessAccountId.trim() || undefined,
            })
            onCreated(data)
            setStep('done')
        } catch {
            toast.error('Erro ao criar canal. Verifique as credenciais do Meta.')
        } finally {
            setWabLoading(false)
        }
    }

    // ── WhatsApp Business OAuth ───────────────────────────────────────────────
    const orgId = useOrgId()

    function startFacebookOAuth() {
        if (!orgId) {
            toast.error('Organização não detectada. Recarregue a página.')
            return
        }

        setWabLoading(true)
        const oauthUrl = `${API_URL}/facebook-oauth/connect?orgId=${orgId}`
        const oauthWindow = window.open(oauthUrl, 'Facebook OAuth', 'width=600,height=700')

        // Escuta mensagens do popup (postMessage)
        const handleMessage = (event: MessageEvent) => {
            // Valida origem
            if (!event.origin.startsWith(API_URL) && !event.origin.startsWith(window.location.origin)) {
                return
            }

            const { type, oauthSession, error } = event.data

            if (type === 'OAUTH_SUCCESS' && oauthSession) {
                setWabLoading(false)
                loadOAuthPhoneNumbers(oauthSession)
                window.removeEventListener('message', handleMessage)
            } else if (type === 'OAUTH_ERROR' && error) {
                setWabLoading(false)
                const errorMessages: Record<string, string> = {
                    'missing_params': 'Parâmetros ausentes no callback do Facebook.',
                    'invalid_state': 'Sessão OAuth inválida ou expirada.',
                    'config_missing': 'Facebook OAuth não está configurado no servidor.',
                    'token_exchange_failed': 'Falha ao trocar código por token de acesso.',
                    'no_business_accounts': 'Nenhuma conta de negócio encontrada.',
                    'no_phone_numbers': 'Nenhum número de WhatsApp disponível.',
                }
                toast.error(errorMessages[error] || 'Erro ao conectar com Facebook.')
                window.removeEventListener('message', handleMessage)
            }
        }

        window.addEventListener('message', handleMessage)

        // Monitora o retorno do OAuth (fallback para query params)
        const checkInterval = setInterval(() => {
            if (oauthWindow?.closed) {
                clearInterval(checkInterval)
                setWabLoading(false)

                // Verifica se há sessão OAuth nos query params (fallback)
                const urlParams = new URLSearchParams(window.location.search)
                const oauthSession = urlParams.get('oauth_session')
                const oauthError = urlParams.get('oauth_error')

                if (oauthError) {
                    const errorMessages: Record<string, string> = {
                        'missing_params': 'Parâmetros ausentes no callback do Facebook.',
                        'invalid_state': 'Sessão OAuth inválida ou expirada.',
                        'config_missing': 'Facebook OAuth não está configurado no servidor.',
                        'token_exchange_failed': 'Falha ao trocar código por token de acesso.',
                        'no_business_accounts': 'Nenhuma conta de negócio encontrada.',
                        'no_phone_numbers': 'Nenhum número de WhatsApp disponível.',
                    }
                    toast.error(errorMessages[oauthError] || 'Erro ao conectar com Facebook.')
                    window.history.replaceState({}, '', window.location.pathname)
                } else if (oauthSession) {
                    window.history.replaceState({}, '', window.location.pathname)
                    loadOAuthPhoneNumbers(oauthSession)
                }

                // Remove listener após popup fechar
                window.removeEventListener('message', handleMessage)
            }
        }, 500)
    }

    // Estados para OAuth
    const [oauthSessionKey, setOauthSessionKey] = useState<string | null>(null)
    const [oauthPhoneNumbers, setOauthPhoneNumbers] = useState<Array<{
        id: string
        displayPhoneNumber: string
        verifiedName: string
        qualityRating?: string
        businessAccountId: string
        businessAccountName: string
    }>>([])
    const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string | null>(null)
    const [oauthLoading, setOauthLoading] = useState(false)

    async function loadOAuthPhoneNumbers(sessionKey: string) {
        setOauthLoading(true)
        try {
            const { data } = await api.get(`/facebook-oauth/phone-numbers/${sessionKey}`)
            setOauthSessionKey(sessionKey)
            setOauthPhoneNumbers(data.phoneNumbers || [])
            setStep('whatsapp-business-oauth-select')
        } catch {
            toast.error('Erro ao carregar números disponíveis.')
        } finally {
            setOauthLoading(false)
        }
    }

    async function createChannelWithOAuth() {
        if (!selectedPhoneNumberId || !oauthSessionKey) {
            toast.error('Selecione um número de telefone.')
            return
        }

        const selectedPhone = oauthPhoneNumbers.find(p => p.id === selectedPhoneNumberId)
        if (!selectedPhone) return

        const channelName = wabName.trim() || `WhatsApp Business - ${selectedPhone.verifiedName}`

        setOauthLoading(true)
        try {
            const { data } = await api.post('/facebook-oauth/create-channel', {
                sessionKey: oauthSessionKey,
                phoneNumberId: selectedPhoneNumberId,
                name: channelName,
                businessAccountId: selectedPhone.businessAccountId,
            })
            onCreated(data)
            setStep('done')
            toast.success('Canal criado com sucesso!')
        } catch {
            toast.error('Erro ao criar canal.')
        } finally {
            setOauthLoading(false)
        }
    }

    // ── QR code + polling ────────────────────────────────────────────────────
    const fetchQrCode = useCallback(async (id: string) => {
        setQrLoading(true)
        try {
            const { data } = await api.post(`/channels/${id}/whatsapp/connect`)
            if (data.qrCode) setQrBase64(data.qrCode)
        } catch {
            toast.error('Erro ao obter QR code.')
        } finally {
            setQrLoading(false)
        }
    }, [])

    // Inicia polling de status quando entra no QR step
    useEffect(() => {
        if (step !== 'whatsapp-qr' || !channelId) return

        const id = setInterval(async () => {
            try {
                const { data } = await api.get(`/channels/${channelId}/whatsapp/status`)
                if (data.channelStatus === 'connected') {
                    clearInterval(id)
                    setConnected(true)
                    setStep('done')
                    onCreated({ id: channelId, name: '', type: 'whatsapp', status: 'connected', createdAt: '' })
                }
            } catch { /* silent */ }
        }, 3000)

        setPollInterval(id)
        return () => clearInterval(id)
    }, [step, channelId])

    // Se vier reconexão, busca QR ao abrir
    useEffect(() => {
        if (reconnectChannel && open) {
            setChannelId(reconnectChannel.id)
            setStep('whatsapp-qr')
            fetchQrCode(reconnectChannel.id)
        }
    }, [reconnectChannel, open])

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-md">

                {/* Pick type */}
                {step === 'pick-type' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Adicionar canal</DialogTitle>
                            <DialogDescription>Escolha como deseja conectar um novo canal de atendimento.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-3 mt-2">
                            <button
                                onClick={() => setStep('api-form')}
                                className="flex items-center gap-4 rounded-xl border-2 p-4 transition-colors hover:border-primary hover:bg-primary/5 text-left"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                    <Globe className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">API Externa</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Integre seu site ou sistema via API REST
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={() => setStep('whatsapp-form')}
                                className="flex items-center gap-4 rounded-xl border-2 p-4 transition-colors hover:border-primary hover:bg-primary/5 text-left"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
                                    <MessageCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">WhatsApp (Evolution API)</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Conecte via Evolution API com QR code (não-oficial)
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={() => setStep('whatsapp-business-form')}
                                className="flex items-center gap-4 rounded-xl border-2 p-4 transition-colors hover:border-primary hover:bg-primary/5 text-left"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                    <MessageCircle className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">WhatsApp Business API</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        API oficial do Meta/Facebook (sem QR code)
                                    </p>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* API form */}
                {step === 'api-form' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-600" /> API Externa
                            </DialogTitle>
                            <DialogDescription>
                                Uma API key será gerada automaticamente para integração.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            <div className="space-y-1.5">
                                <Label>Nome do canal</Label>
                                <Input
                                    placeholder="ex: Site principal"
                                    value={apiName}
                                    onChange={(e) => setApiName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && createApiChannel()}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep('pick-type')}>
                                Voltar
                            </Button>
                            <Button className="flex-1" onClick={createApiChannel} disabled={!apiName.trim() || apiLoading}>
                                {apiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar canal
                            </Button>
                        </div>
                    </>
                )}

                {/* WhatsApp form */}
                {step === 'whatsapp-form' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-green-600" /> WhatsApp (Evolution)
                            </DialogTitle>
                            <DialogDescription>
                                Informe os dados da sua instância Evolution API.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 mt-2">
                            <div className="space-y-1.5">
                                <Label>Nome do canal</Label>
                                <Input placeholder="ex: Suporte WhatsApp" value={waName} onChange={(e) => setWaName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>URL da Evolution API</Label>
                                <Input placeholder="https://evolution.suaempresa.com" value={waUrl} onChange={(e) => setWaUrl(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>API Key global</Label>
                                <Input
                                    placeholder={hasDefaultKey ? '(usando chave padrão do servidor)' : 'sua-api-key'}
                                    type="password"
                                    value={waKey}
                                    onChange={(e) => setWaKey(e.target.value)}
                                />
                                {hasDefaultKey && !waKey && (
                                    <p className="text-[11px] text-muted-foreground">
                                        Chave padrão configurada no servidor. Deixe em branco para usá-la.
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                                O nome da instância será gerado automaticamente com base no nome do canal.
                            </p>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep('pick-type')}>
                                Voltar
                            </Button>
                            <Button className="flex-1" onClick={createWhatsAppChannel} disabled={waLoading}>
                                {waLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Conectar
                            </Button>
                        </div>
                    </>
                )}

                {/* WhatsApp Business form */}
                {step === 'whatsapp-business-form' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-blue-600" /> WhatsApp Business API
                            </DialogTitle>
                            <DialogDescription>
                                Configure sua conexão com a API oficial do Meta. <a href="/WHATSAPP_BUSINESS_SETUP.md" target="_blank" className="underline">Ver guia completo</a>
                            </DialogDescription>
                        </DialogHeader>

                        {/* OAuth ou Manual */}
                        <div className="space-y-3 mt-4">
                            {/* Botão OAuth (Recomendado) */}
                            <button
                                onClick={startFacebookOAuth}
                                disabled={wabLoading}
                                className="w-full flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 transition-colors hover:border-blue-300 hover:bg-blue-100 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600">
                                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-blue-900">
                                            Conectar com Facebook
                                        </p>
                                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
                                            Recomendado
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        Faça login e selecione o número automaticamente
                                    </p>
                                </div>
                                {wabLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-muted-foreground/20"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-background px-2 text-muted-foreground">ou configurar manualmente</span>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="max-h-[400px] pr-4">
                            <div className="space-y-3 mt-2">
                                <div className="space-y-1.5">
                                    <Label>Nome do canal *</Label>
                                    <Input
                                        placeholder="ex: WhatsApp Business - Empresa"
                                        value={wabName}
                                        onChange={(e) => setWabName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Phone Number ID *</Label>
                                    <Input
                                        placeholder="123456789012345"
                                        value={wabPhoneNumberId}
                                        onChange={(e) => setWabPhoneNumberId(e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Encontre em: WhatsApp → Introdução no Meta for Developers
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Access Token (Permanente) *</Label>
                                    <Input
                                        placeholder="EAABsbCS1iHgBO7ZCcxK2kZBR..."
                                        type="password"
                                        value={wabAccessToken}
                                        onChange={(e) => setWabAccessToken(e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Gere um System User Token com permissões de WhatsApp
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Webhook Verify Token *</Label>
                                    <Input
                                        placeholder="seu_token_secreto_123"
                                        type="password"
                                        value={wabWebhookVerifyToken}
                                        onChange={(e) => setWabWebhookVerifyToken(e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Crie um token secreto para verificação do webhook
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Business Account ID (opcional)</Label>
                                    <Input
                                        placeholder="102851234567890"
                                        value={wabBusinessAccountId}
                                        onChange={(e) => setWabBusinessAccountId(e.target.value)}
                                    />
                                </div>
                                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
                                    <p className="text-xs font-medium text-blue-900">📋 Configurar Webhook no Meta:</p>
                                    <p className="text-[11px] text-blue-800">
                                        URL: <code className="bg-white px-1 rounded">{API_URL}/channels/whatsapp-business/webhook</code>
                                    </p>
                                    <p className="text-[11px] text-blue-800">
                                        Campos: <code className="bg-white px-1 rounded">messages</code>
                                    </p>
                                </div>
                            </div>
                        </ScrollArea>
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep('pick-type')}>
                                Voltar
                            </Button>
                            <Button className="flex-1" onClick={createWhatsAppBusinessChannel} disabled={wabLoading}>
                                {wabLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar canal
                            </Button>
                        </div>
                    </>
                )}

                {/* WhatsApp Business OAuth - Seleção de Número */}
                {step === 'whatsapp-business-oauth-select' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-blue-600" /> Selecione o número
                            </DialogTitle>
                            <DialogDescription>
                                Escolha qual número do WhatsApp Business você deseja conectar.
                            </DialogDescription>
                        </DialogHeader>

                        {oauthLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                <ScrollArea className="max-h-[400px] pr-4">
                                    <div className="space-y-3 mt-2">
                                        {/* Nome do canal */}
                                        <div className="space-y-1.5">
                                            <Label>Nome do canal (opcional)</Label>
                                            <Input
                                                placeholder="ex: WhatsApp Business - DECOL"
                                                value={wabName}
                                                onChange={(e) => setWabName(e.target.value)}
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Se não preencher, usaremos o nome verificado do número
                                            </p>
                                        </div>

                                        {/* Lista de números disponíveis */}
                                        <div className="space-y-2">
                                            <Label>Números disponíveis ({oauthPhoneNumbers.length})</Label>
                                            {oauthPhoneNumbers.map((phone) => (
                                                <button
                                                    key={phone.id}
                                                    onClick={() => setSelectedPhoneNumberId(phone.id)}
                                                    className={cn(
                                                        'w-full flex items-start gap-3 rounded-xl border-2 p-4 transition-colors text-left',
                                                        selectedPhoneNumberId === phone.id
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-input hover:border-primary/50 hover:bg-muted/50'
                                                    )}
                                                >
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                                                        <MessageCircle className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm">{phone.verifiedName}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {phone.displayPhoneNumber}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-1">
                                                            {phone.businessAccountName}
                                                        </p>
                                                        {phone.qualityRating && (
                                                            <Badge className="mt-1.5 text-[10px] h-5">
                                                                Qualidade: {phone.qualityRating}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {selectedPhoneNumberId === phone.id && (
                                                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {oauthPhoneNumbers.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <XCircle className="h-12 w-12 text-muted-foreground mb-3" />
                                                <p className="text-sm font-medium">Nenhum número disponível</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Verifique se você tem números configurados no WhatsApp Business
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="flex gap-2 mt-4">
                                    <Button variant="outline" className="flex-1" onClick={() => setStep('whatsapp-business-form')}>
                                        Voltar
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={createChannelWithOAuth}
                                        disabled={!selectedPhoneNumberId || oauthLoading}
                                    >
                                        {oauthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Criar canal
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* WhatsApp QR */}
                {step === 'whatsapp-qr' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-green-600" /> Escanear QR code
                            </DialogTitle>
                            <DialogDescription>
                                Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e aponte a câmera para o código abaixo.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center gap-4 py-4">
                            {qrLoading && (
                                <div className="flex h-48 w-48 items-center justify-center rounded-xl border bg-muted">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {!qrLoading && qrBase64 && (
                                <div className="rounded-xl border p-3 bg-white shadow-sm">
                                    <img
                                        src={qrBase64}
                                        alt="QR Code WhatsApp"
                                        width={192}
                                        height={192}
                                        className="rounded"
                                    />
                                </div>
                            )}

                            {!qrLoading && !qrBase64 && (
                                <div className="flex h-48 w-48 flex-col items-center justify-center rounded-xl border bg-muted gap-2">
                                    <WifiOff className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground text-center px-4">
                                        Não foi possível gerar o QR code. Verifique sua Evolution API.
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Aguardando leitura do QR code…
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => fetchQrCode(channelId)}
                            disabled={qrLoading}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Gerar novo QR code
                        </Button>
                    </>
                )}

                {/* Done */}
                {step === 'done' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" /> Canal criado com sucesso!
                            </DialogTitle>
                            <DialogDescription>
                                Seu canal foi configurado e está pronto para uso.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center py-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleClose}>Fechar</Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

// ─── Delete Channel Dialog ────────────────────────────────────────────────────

function DeleteChannelDialog({
    channel,
    open,
    onClose,
    onConfirm,
}: {
    channel: Channel | null
    open: boolean
    onClose: () => void
    onConfirm: () => void
}) {
    const [deleting, setDeleting] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    // Reseta o input quando o dialog abre/fecha
    useEffect(() => {
        if (!open) {
            setConfirmText('')
        }
    }, [open])

    async function handleConfirm() {
        setDeleting(true)
        await onConfirm()
        setDeleting(false)
    }

    if (!channel) return null

    // Determina o nome da instância/canal baseado no tipo
    const getInstanceName = () => {
        if (channel.type === 'whatsapp' && channel.config) {
            const cfg = channel.config as any
            return cfg.instanceName || channel.name
        }
        return channel.name
    }

    const instanceName = getInstanceName()
    const isConfirmValid = confirmText === instanceName

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Confirmar Exclusão
                    </DialogTitle>
                    <DialogDescription>
                        Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Nome da instância/canal */}
                    <div className="rounded-lg bg-muted p-3">
                        <p className="text-sm font-medium mb-1">Canal a ser removido:</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{instanceName}</p>
                    </div>

                    {/* Aviso sobre dessincronização */}
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-destructive">
                                    Atenção: Impacto nos Dados
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Ao excluir este canal:
                                </p>
                                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
                                    <li>Todos os contatos vinculados a este canal serão <strong>dessincronizados</strong></li>
                                    <li>As conversas existentes permanecerão no histórico, mas <strong>não receberão novas mensagens</strong></li>
                                    <li>Você precisará <strong>reconfigurar o canal</strong> para restaurar a conexão</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Input de confirmação */}
                    <div className="space-y-2">
                        <Label htmlFor="confirm-input" className="text-sm font-medium">
                            Para confirmar, digite o nome do canal: <span className="font-mono font-semibold text-destructive">{instanceName}</span>
                        </Label>
                        <Input
                            id="confirm-input"
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={`Digite: ${instanceName}`}
                            className={cn(
                                'font-mono',
                                confirmText && !isConfirmValid && 'border-destructive focus-visible:ring-destructive'
                            )}
                            disabled={deleting}
                            autoComplete="off"
                        />
                        {confirmText && !isConfirmValid && (
                            <p className="text-xs text-destructive">
                                O nome não corresponde. Digite exatamente: <span className="font-mono font-semibold">{instanceName}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isConfirmValid || deleting}
                    >
                        {deleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Removendo...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sim, Remover Canal
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelsPage() {
    const { data: perms } = usePermissions()
    const orgId = useOrgId()
    const router = useRouter()
    const [channels, setChannels] = useState<Channel[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [reconnectChannel, setReconnectChannel] = useState<Channel | undefined>()
    const [widgetChannel, setWidgetChannel] = useState<Channel | null>(null)
    const [embedChannel, setEmbedChannel] = useState<Channel | null>(null)
    const [deleteChannel, setDeleteChannel] = useState<Channel | null>(null)

    function handleTest(ch: Channel) {
        router.push('/test')
    }

    async function loadChannels() {
        setLoading(true)
        try {
            const { data } = await api.get('/channels')
            setChannels(data)

            // Atualiza status e telefone dos canais WhatsApp
            const whatsappChannels = data.filter((ch: Channel) => ch.type === 'whatsapp' && ch.status !== 'pending')
            if (whatsappChannels.length > 0) {
                // Dispara as verificações de status
                await Promise.allSettled(
                    whatsappChannels.map((ch: Channel) =>
                        api.get(`/channels/${ch.id}/whatsapp/status`)
                    )
                )
                // Recarrega os canais para pegar os telefones atualizados
                const { data: updatedData } = await api.get('/channels')
                setChannels(updatedData)
            }
        } catch {
            toast.error('Erro ao carregar canais.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (orgId) loadChannels() }, [orgId])

    function handleCreated(ch: Channel) {
        if (orgId) loadChannels()
        toast.success('Canal adicionado!')
    }

    function handleDelete(id: string) {
        const channel = channels.find((c) => c.id === id)
        if (channel) {
            setDeleteChannel(channel)
        }
    }

    async function confirmDelete() {
        if (!deleteChannel) return
        try {
            await api.delete(`/channels/${deleteChannel.id}`)
            setChannels((prev) => prev.filter((c) => c.id !== deleteChannel.id))
            toast.success('Canal removido com sucesso.')
            setDeleteChannel(null)
        } catch {
            toast.error('Erro ao remover canal.')
        }
    }

    function handleReconnect(ch: Channel) {
        setReconnectChannel(ch)
        setDialogOpen(true)
    }

    const whatsapp = channels.filter((c) => c.type === 'whatsapp')
    const whatsappBusiness = channels.filter((c) => c.type === 'whatsapp-business')
    const apiChannels = channels.filter((c) => c.type === 'api')
    const isEmpty = !loading && channels.length === 0

    if (perms && !perms.permissions.canManageChannels) return <NoPermission />

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold">Canais</h1>
                    <p className="text-sm text-muted-foreground">Gerencie suas integrações de atendimento</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={loadChannels}
                        disabled={!orgId || loading}
                        title="Atualizar status e telefones"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button
                        onClick={() => { setReconnectChannel(undefined); setDialogOpen(true) }}
                        disabled={!orgId}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar canal
                    </Button>
                </div>
            </div>

            {/* Loading / empty state — centralizado na altura disponível */}
            {(loading || isEmpty) && (
                <div className="flex flex-1 items-center justify-center">
                    {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                    {isEmpty && (
                        <div className="flex flex-col items-center gap-4 text-center px-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <Plug className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold text-base">Nenhum canal configurado</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Adicione um canal para começar a receber conversas.
                                </p>
                            </div>
                            <Button onClick={() => setDialogOpen(true)} disabled={!orgId}>
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar canal
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Lista de canais */}
            {!loading && channels.length > 0 && (
                <ScrollArea className="flex-1">
                    <div className="px-6 py-6 max-w-3xl space-y-8">
                        {whatsapp.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                    <h2 className="text-sm font-semibold">WhatsApp (Evolution API)</h2>
                                    <Badge variant="secondary" className="text-xs">{whatsapp.length}</Badge>
                                </div>
                                {whatsapp.map((ch) => (
                                    <ChannelCard key={ch.id} channel={ch} onDelete={handleDelete} onReconnect={handleReconnect} onEmbedIframe={setEmbedChannel} />
                                ))}

                                {/* ── Webhook info ── */}
                                <WebhookInfoCard />
                            </section>
                        )}
                        {whatsappBusiness.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-blue-600" />
                                    <h2 className="text-sm font-semibold">WhatsApp Business API (Meta)</h2>
                                    <Badge variant="secondary" className="text-xs">{whatsappBusiness.length}</Badge>
                                </div>
                                {whatsappBusiness.map((ch) => (
                                    <ChannelCard
                                        key={ch.id}
                                        channel={ch}
                                        onDelete={handleDelete}
                                        onReconnect={handleReconnect}
                                        onEmbedIframe={setEmbedChannel}
                                    />
                                ))}
                            </section>
                        )}
                        {apiChannels.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-blue-600" />
                                    <h2 className="text-sm font-semibold">API Externa</h2>
                                    <Badge variant="secondary" className="text-xs">{apiChannels.length}</Badge>
                                </div>
                                {apiChannels.map((ch) => (
                                    <ChannelCard key={ch.id} channel={ch} onDelete={handleDelete} onReconnect={handleReconnect} onWidgetConfig={setWidgetChannel} />
                                ))}
                            </section>
                        )}
                    </div>
                </ScrollArea>
            )}

            {orgId && (
                <AddChannelDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onCreated={handleCreated}
                    reconnectChannel={reconnectChannel}
                />
            )}

            {widgetChannel && (
                <WidgetConfigDialog
                    channel={widgetChannel}
                    open={!!widgetChannel}
                    onClose={() => setWidgetChannel(null)}
                    onSaved={() => { if (orgId) loadChannels() }}
                />
            )}

            {embedChannel && (
                <IframeEmbedDialog
                    channel={embedChannel}
                    open={!!embedChannel}
                    onClose={() => setEmbedChannel(null)}
                />
            )}

            <DeleteChannelDialog
                channel={deleteChannel}
                open={!!deleteChannel}
                onClose={() => setDeleteChannel(null)}
                onConfirm={confirmDelete}
            />
        </div>
    )
}
