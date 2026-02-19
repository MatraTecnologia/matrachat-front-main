'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Megaphone, Plus, Trash2, Settings, Facebook, Users,
    Calendar, Target, ChevronRight, Loader2, X, Copy, Check,
    TrendingUp, Globe, MessageCircle, Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Campaign = {
    id: string
    name: string
    description?: string | null
    status: string
    keywords: string[]
    startDate?: string | null
    endDate?: string | null
    goalLeads?: number | null
    sourceChannel: string
    fbPageId?: string | null
    fbPageToken?: string | null
    fbFormIds: string[]
    createdAt: string
    _count: { leads: number }
}

type CampaignLead = {
    id: string
    source: string
    formName?: string | null
    fbLeadId?: string | null
    createdAt: string
    contact?: {
        id: string; name: string; phone?: string | null
        email?: string | null; avatarUrl?: string | null
    } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useOrgId() {
    const [orgId, setOrgId] = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id) })
            .catch(() => null)
    }, [])
    return orgId
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

function statusLabel(s: string) {
    if (s === 'active')  return { label: 'Ativa',     cls: 'bg-green-100 text-green-700' }
    if (s === 'paused')  return { label: 'Pausada',   cls: 'bg-yellow-100 text-yellow-700' }
    return                       { label: 'Encerrada', cls: 'bg-gray-100 text-gray-600' }
}

function channelLabel(c: string) {
    if (c === 'facebook')  return { label: 'Facebook',  icon: <Facebook className="h-3 w-3" /> }
    if (c === 'whatsapp')  return { label: 'WhatsApp',  icon: <MessageCircle className="h-3 w-3" /> }
    if (c === 'widget')    return { label: 'Widget',    icon: <Globe className="h-3 w-3" /> }
    return                         { label: 'Todos',     icon: <Hash className="h-3 w-3" /> }
}

function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// ─── CampaignCard ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
    const { label, cls }     = statusLabel(campaign.status)
    const { label: chLabel, icon: chIcon } = channelLabel(campaign.sourceChannel)
    const progress = campaign.goalLeads ? Math.min(100, Math.round((campaign._count.leads / campaign.goalLeads) * 100)) : null

    return (
        <div
            onClick={onClick}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', cls)}>
                            {label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {chIcon}{chLabel}
                        </span>
                    </div>
                    <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                    {campaign.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{campaign.description}</p>
                    )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
            </div>

            {/* Keywords */}
            {campaign.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {campaign.keywords.slice(0, 4).map((kw) => (
                        <span key={kw} className="rounded-full bg-primary/8 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-medium">
                            #{kw}
                        </span>
                    ))}
                    {campaign.keywords.length > 4 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                            +{campaign.keywords.length - 4}
                        </span>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-1 border-t">
                <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{campaign._count.leads}</span>
                    <span className="text-xs text-muted-foreground">leads</span>
                </div>
                {campaign.goalLeads && (
                    <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">meta {campaign.goalLeads}</span>
                    </div>
                )}
                {(campaign.startDate || campaign.endDate) && (
                    <div className="flex items-center gap-1 ml-auto">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                            {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('pt-BR') : '—'}
                            {' → '}
                            {campaign.endDate   ? new Date(campaign.endDate).toLocaleDateString('pt-BR')   : 'sem fim'}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {progress !== null && (
                <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right">{progress}% da meta</p>
                </div>
            )}
        </div>
    )
}

// ─── CreateDialog ─────────────────────────────────────────────────────────────

function CreateDialog({ open, onClose, onCreated, orgId }: {
    open: boolean
    onClose: () => void
    onCreated: (c: Campaign) => void
    orgId: string
}) {
    const [name, setName]                   = useState('')
    const [description, setDescription]     = useState('')
    const [keywordInput, setKeywordInput]   = useState('')
    const [keywords, setKeywords]           = useState<string[]>([])
    const [startDate, setStartDate]         = useState('')
    const [endDate, setEndDate]             = useState('')
    const [goalLeads, setGoalLeads]         = useState('')
    const [sourceChannel, setSourceChannel] = useState('all')
    const [saving, setSaving]               = useState(false)

    function addKeyword() {
        const kw = keywordInput.trim().replace(/^#/, '')
        if (!kw || keywords.includes(kw)) { setKeywordInput(''); return }
        setKeywords((prev) => [...prev, kw])
        setKeywordInput('')
    }

    async function handleCreate() {
        if (!name.trim()) return
        setSaving(true)
        try {
            const { data } = await api.post('/campaigns', {
                orgId,
                name:          name.trim(),
                description:   description.trim() || undefined,
                keywords,
                startDate:     startDate || undefined,
                endDate:       endDate   || undefined,
                goalLeads:     goalLeads ? parseInt(goalLeads) : undefined,
                sourceChannel,
            })
            onCreated(data)
            onClose()
            setName(''); setDescription(''); setKeywords([]); setStartDate('')
            setEndDate(''); setGoalLeads(''); setSourceChannel('all')
        } catch { /* silent */ } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nova Campanha</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Nome *</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Black Friday 2025" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Descrição</label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" className="h-9" />
                    </div>

                    {/* Keywords */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Palavras-chave</label>
                        <div className="flex gap-2">
                            <Input
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                                placeholder="#promo2025"
                                className="h-9"
                            />
                            <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={addKeyword}>
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {keywords.map((kw) => (
                                    <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                                        #{kw}
                                        <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Data início</label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Data fim</label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Meta de leads</label>
                            <Input type="number" min={1} value={goalLeads} onChange={(e) => setGoalLeads(e.target.value)} placeholder="Ex: 100" className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Canal de origem</label>
                            <select
                                value={sourceChannel}
                                onChange={(e) => setSourceChannel(e.target.value)}
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            >
                                <option value="all">Todos</option>
                                <option value="facebook">Facebook</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="widget">Widget</option>
                            </select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={!name.trim() || saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Criar Campanha
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── DetailSheet ──────────────────────────────────────────────────────────────

function DetailSheet({ campaign: initial, orgId, onClose, onUpdated, onDeleted }: {
    campaign: Campaign
    orgId: string
    onClose: () => void
    onUpdated: (c: Campaign) => void
    onDeleted: (id: string) => void
}) {
    const [campaign, setCampaign] = useState(initial)
    const [leads, setLeads]       = useState<CampaignLead[]>([])
    const [loadingLeads, setLoadingLeads] = useState(false)
    const [saving, setSaving]     = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [copied, setCopied]     = useState(false)

    // editable fields
    const [name, setName]                   = useState(campaign.name)
    const [description, setDescription]     = useState(campaign.description ?? '')
    const [status, setStatus]               = useState(campaign.status)
    const [keywordInput, setKeywordInput]   = useState('')
    const [keywords, setKeywords]           = useState<string[]>(campaign.keywords)
    const [startDate, setStartDate]         = useState(campaign.startDate ? campaign.startDate.slice(0, 10) : '')
    const [endDate, setEndDate]             = useState(campaign.endDate   ? campaign.endDate.slice(0, 10)   : '')
    const [goalLeads, setGoalLeads]         = useState(campaign.goalLeads?.toString() ?? '')
    const [sourceChannel, setSourceChannel] = useState(campaign.sourceChannel)
    // Facebook fields
    const [fbPageId, setFbPageId]     = useState(campaign.fbPageId ?? '')
    const [fbPageToken, setFbPageToken] = useState(campaign.fbPageToken ?? '')
    const [fbFormInput, setFbFormInput] = useState('')
    const [fbFormIds, setFbFormIds]     = useState<string[]>(campaign.fbFormIds)

    const webhookUrl = `${BACKEND_URL}/campaigns/facebook/webhook/${orgId}`
    const verifyToken = `matra-fb-${orgId}`

    function addKeyword() {
        const kw = keywordInput.trim().replace(/^#/, '')
        if (!kw || keywords.includes(kw)) { setKeywordInput(''); return }
        setKeywords((prev) => [...prev, kw])
        setKeywordInput('')
    }

    function addFormId() {
        const fid = fbFormInput.trim()
        if (!fid || fbFormIds.includes(fid)) { setFbFormInput(''); return }
        setFbFormIds((prev) => [...prev, fid])
        setFbFormInput('')
    }

    const loadLeads = useCallback(async () => {
        setLoadingLeads(true)
        try {
            const { data } = await api.get(`/campaigns/${campaign.id}/leads`, { params: { limit: 100 } })
            setLeads(data.leads)
        } catch { setLeads([]) } finally { setLoadingLeads(false) }
    }, [campaign.id])

    async function handleSave() {
        setSaving(true)
        try {
            const { data } = await api.patch(`/campaigns/${campaign.id}`, {
                name:          name.trim(),
                description:   description.trim() || null,
                status,
                keywords,
                startDate:     startDate || null,
                endDate:       endDate   || null,
                goalLeads:     goalLeads ? parseInt(goalLeads) : null,
                sourceChannel,
                fbPageId:      fbPageId    || null,
                fbPageToken:   fbPageToken || null,
                fbFormIds,
            })
            const updated = { ...campaign, ...data, _count: campaign._count }
            setCampaign(updated)
            onUpdated(updated)
        } catch { /* silent */ } finally { setSaving(false) }
    }

    async function handleDelete() {
        try {
            await api.delete(`/campaigns/${campaign.id}`)
            onDeleted(campaign.id)
        } catch { /* silent */ }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-[640px] max-w-full bg-background z-50 flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 border-b px-6 py-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-primary shrink-0" />
                            <h2 className="font-semibold text-sm truncate">{campaign.name}</h2>
                            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                                statusLabel(campaign.status).cls)}>
                                {statusLabel(campaign.status).label}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {campaign._count.leads} leads captados
                            {campaign.goalLeads ? ` de ${campaign.goalLeads}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir campanha
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="config" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="mx-6 mt-3 w-auto shrink-0 justify-start h-8">
                        <TabsTrigger value="config" className="text-xs h-7">Configurações</TabsTrigger>
                        <TabsTrigger value="facebook" className="text-xs h-7 gap-1.5" onClick={loadLeads}>
                            <Facebook className="h-3 w-3" /> Facebook
                        </TabsTrigger>
                        <TabsTrigger value="leads" className="text-xs h-7 gap-1" onClick={loadLeads}>
                            <Users className="h-3 w-3" />
                            Leads
                            {campaign._count.leads > 0 && (
                                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 font-bold leading-none">
                                    {campaign._count.leads}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Configurações ── */}
                    <TabsContent value="config" className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-medium">Nome</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-medium">Descrição</label>
                                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Status</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)}
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                                        <option value="active">Ativa</option>
                                        <option value="paused">Pausada</option>
                                        <option value="ended">Encerrada</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Canal de origem</label>
                                    <select value={sourceChannel} onChange={(e) => setSourceChannel(e.target.value)}
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                                        <option value="all">Todos</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="widget">Widget</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Data início</label>
                                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Data fim</label>
                                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Meta de leads</label>
                                    <Input type="number" min={1} value={goalLeads} onChange={(e) => setGoalLeads(e.target.value)} placeholder="Ex: 100" className="h-9" />
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Palavras-chave</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                                        placeholder="#promo2025"
                                        className="h-9"
                                    />
                                    <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={addKeyword}>
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {keywords.map((kw) => (
                                        <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                                            #{kw}
                                            <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}>
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Salvar alterações
                            </Button>
                        </div>
                    </TabsContent>

                    {/* ── Facebook ── */}
                    <TabsContent value="facebook" className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="space-y-5">
                            {/* Instruções */}
                            <div className="rounded-lg border bg-blue-50 p-4 space-y-2">
                                <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                                    <Facebook className="h-3.5 w-3.5" /> Como conectar o Facebook Lead Ads
                                </p>
                                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                    <li>Acesse o <strong>Meta Business Suite → Configurações → Webhooks</strong></li>
                                    <li>Adicione um webhook para <strong>Página</strong> com a URL abaixo</li>
                                    <li>Use o <strong>Token de Verificação</strong> abaixo ao configurar</li>
                                    <li>Insira o <strong>ID da Página</strong> e um <strong>Token de Página</strong> (longa duração)</li>
                                    <li>Cole os <strong>IDs dos Formulários</strong> que deseja monitorar</li>
                                </ol>
                            </div>

                            {/* Webhook URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">URL do Webhook</label>
                                <div className="flex gap-2">
                                    <Input value={webhookUrl} readOnly className="h-9 text-xs font-mono bg-muted" />
                                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => copyToClipboard(webhookUrl)}>
                                        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Verify Token */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Token de Verificação</label>
                                <div className="flex gap-2">
                                    <Input value={verifyToken} readOnly className="h-9 text-xs font-mono bg-muted" />
                                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => copyToClipboard(verifyToken)}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Use este token ao registrar o webhook no Meta Business Suite.
                                </p>
                            </div>

                            {/* Page ID + Token */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">ID da Página Facebook</label>
                                    <Input value={fbPageId} onChange={(e) => setFbPageId(e.target.value)} placeholder="123456789" className="h-9 text-xs" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-medium">Token de Página (longa duração)</label>
                                    <Input value={fbPageToken} onChange={(e) => setFbPageToken(e.target.value)} placeholder="EAABwzLixnjYBO..." type="password" className="h-9 text-xs" />
                                    <p className="text-[10px] text-muted-foreground">
                                        Gere em: Meta Business Suite → Configurações → Tokens de Acesso
                                    </p>
                                </div>
                            </div>

                            {/* Form IDs */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium">IDs dos Formulários de Lead</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={fbFormInput}
                                        onChange={(e) => setFbFormInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFormId() } }}
                                        placeholder="ID do formulário (ex: 987654321)"
                                        className="h-9 text-xs"
                                    />
                                    <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={addFormId}>
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Deixe vazio para capturar leads de todos os formulários da página.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {fbFormIds.map((fid) => (
                                        <span key={fid} className="inline-flex items-center gap-1 rounded bg-muted text-xs px-2 py-0.5 font-mono">
                                            {fid}
                                            <button onClick={() => setFbFormIds((p) => p.filter((f) => f !== fid))}>
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Salvar configuração Facebook
                            </Button>
                        </div>
                    </TabsContent>

                    {/* ── Leads ── */}
                    <TabsContent value="leads" className="flex-1 overflow-y-auto px-6 py-4">
                        {loadingLeads ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <TrendingUp className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Nenhum lead ainda</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Configure o Facebook Lead Ads para começar a capturar leads automaticamente.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {leads.map((lead) => (
                                    <div key={lead.id} className="flex items-center gap-3 rounded-lg border p-3">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            {lead.contact?.avatarUrl && <AvatarImage src={lead.contact.avatarUrl} />}
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                {lead.contact ? initials(lead.contact.name) : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {lead.contact?.name ?? 'Lead sem contato'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {lead.contact?.email ?? lead.contact?.phone ?? '—'}
                                                {lead.formName && ` · ${lead.formName}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <Badge variant="secondary" className="text-[10px] capitalize">
                                                {lead.source}
                                            </Badge>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Confirm delete */}
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todos os leads associados também serão removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
    const { data: perms } = usePermissions()
    const orgId                   = useOrgId()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading]   = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [selected, setSelected] = useState<Campaign | null>(null)

    const loadCampaigns = useCallback(async (id: string) => {
        setLoading(true)
        try {
            const { data } = await api.get('/campaigns', { params: { orgId: id } })
            setCampaigns(data)
        } catch { setCampaigns([]) } finally { setLoading(false) }
    }, [])

    useEffect(() => {
        if (orgId) loadCampaigns(orgId)
    }, [orgId, loadCampaigns])

    function handleCreated(c: Campaign) {
        setCampaigns((prev) => [{ ...c, _count: { leads: 0 } }, ...prev])
    }

    function handleUpdated(c: Campaign) {
        setCampaigns((prev) => prev.map((p) => p.id === c.id ? c : p))
        setSelected(c)
    }

    function handleDeleted(id: string) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        setSelected(null)
    }

    if (perms && !perms.permissions.canManageCampaigns) return <NoPermission />

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
                <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    <div>
                        <h1 className="text-base font-semibold">Campanhas</h1>
                        <p className="text-xs text-muted-foreground">
                            Gerencie campanhas e capte leads via Facebook Lead Ads
                        </p>
                    </div>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!orgId}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nova Campanha
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                            <Megaphone className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-base font-semibold">Nenhuma campanha ainda</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                Crie sua primeira campanha para começar a capturar leads do Facebook Lead Ads automaticamente.
                            </p>
                        </div>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Criar primeira campanha
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {campaigns.map((c) => (
                            <CampaignCard key={c.id} campaign={c} onClick={() => setSelected(c)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create dialog */}
            {orgId && (
                <CreateDialog
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    onCreated={handleCreated}
                    orgId={orgId}
                />
            )}

            {/* Detail sheet */}
            {selected && orgId && (
                <DetailSheet
                    campaign={selected}
                    orgId={orgId}
                    onClose={() => setSelected(null)}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    )
}
