'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
    Bot, Headphones, DollarSign, Users, BarChart2, Plus, Settings2,
    Loader2, Trash2, Eye, EyeOff, Upload, FileText, Image, X,
    Check, Zap, ChevronDown, Globe, MessageCircle, Hash, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────────────────────

type AgentType = 'support' | 'sales' | 'financial' | 'hr' | 'custom'
type AgentModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo'
type FileCategory = 'general' | 'prices' | 'products' | 'tips' | 'faq'

type OrgChannel = {
    id: string
    name: string
    type: string
    status: string
}

type AiAgent = {
    id: string
    organizationId: string
    name: string
    description?: string | null
    type: AgentType
    model: AgentModel
    apiKey?: string | null
    systemPrompt?: string | null
    temperature: number
    active: boolean
    channelIds: string[]
    createdAt: string
    updatedAt: string
    _count: { files: number }
}

type AgentFile = {
    id: string
    name: string
    mimeType: string
    category: FileCategory
    sizeBytes: number
    createdAt: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const AGENT_TYPES: { value: AgentType; label: string; icon: React.ElementType; color: string; prompt: string }[] = [
    {
        value: 'support',
        label: 'Suporte',
        icon: Headphones,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        prompt: 'Você é um assistente de suporte ao cliente amigável e prestativo. Responda dúvidas com clareza, resolva problemas com empatia e sempre mantenha um tom positivo. Quando não souber a resposta, oriente o cliente a entrar em contato com um atendente humano.',
    },
    {
        value: 'sales',
        label: 'Vendas',
        icon: DollarSign,
        color: 'text-green-600 bg-green-50 border-green-200',
        prompt: 'Você é um consultor de vendas especialista e entusiasta. Apresente produtos e serviços com destaque nos benefícios, entenda as necessidades do cliente, ofereça soluções personalizadas e conduza o cliente de forma natural até a decisão de compra.',
    },
    {
        value: 'financial',
        label: 'Financeiro',
        icon: BarChart2,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        prompt: 'Você é um assistente financeiro preciso e confiável. Ajude com dúvidas sobre cobranças, faturas, pagamentos e condições financeiras. Seja claro com números e prazos, e escalone para humanos quando necessário.',
    },
    {
        value: 'hr',
        label: 'RH',
        icon: Users,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        prompt: 'Você é um assistente de Recursos Humanos profissional e discreto. Responda dúvidas sobre políticas da empresa, benefícios, processo seletivo e onboarding. Mantenha confidencialidade e direcione para o RH humano quando necessário.',
    },
    {
        value: 'custom',
        label: 'Personalizado',
        icon: Bot,
        color: 'text-slate-600 bg-slate-50 border-slate-200',
        prompt: '',
    },
]

const AI_MODELS: { value: AgentModel; label: string; desc: string }[] = [
    { value: 'gpt-4o',       label: 'GPT-4o',       desc: 'Mais capaz, ideal para tarefas complexas' },
    { value: 'gpt-4o-mini',  label: 'GPT-4o mini',  desc: 'Rápido e econômico, ótimo custo-benefício' },
    { value: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo',desc: 'Mais acessível, bom para tarefas simples' },
]

const FILE_CATEGORIES: { value: FileCategory; label: string; color: string }[] = [
    { value: 'general',  label: 'Geral',             color: 'bg-slate-100 text-slate-700' },
    { value: 'prices',   label: 'Tabela de Preços',  color: 'bg-green-100 text-green-700' },
    { value: 'products', label: 'Catálogo de Produtos', color: 'bg-blue-100 text-blue-700' },
    { value: 'tips',     label: 'Dicas',             color: 'bg-amber-100 text-amber-700' },
    { value: 'faq',      label: 'FAQ',               color: 'bg-purple-100 text-purple-700' },
]

const MAX_FILE_MB = 5

// ─── Helpers ───────────────────────────────────────────────────────────────────

function agentTypeInfo(type: AgentType) {
    return AGENT_TYPES.find((t) => t.value === type) ?? AGENT_TYPES[AGENT_TYPES.length - 1]
}

function fileCategoryInfo(cat: FileCategory) {
    return FILE_CATEGORIES.find((c) => c.value === cat) ?? FILE_CATEGORIES[0]
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1]) // strip data:...;base64,
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// ─── useOrgId ──────────────────────────────────────────────────────────────────

function useOrgId() {
    const [orgId, setOrgId] = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations').then(({ data }) => {
            if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id)
        }).catch(() => null)
    }, [])
    return orgId
}

// ─── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, onConfigure, onDeleted }: {
    agent: AiAgent
    onConfigure: (a: AiAgent) => void
    onDeleted: (id: string) => void
}) {
    const [deleting, setDeleting] = useState(false)
    const info = agentTypeInfo(agent.type)
    const Icon = info.icon

    async function handleDelete() {
        setDeleting(true)
        try {
            await api.delete(`/copilot/agents/${agent.id}`)
            onDeleted(agent.id)
            toast.success('Agente removido.')
        } catch {
            toast.error('Erro ao remover agente.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            {/* Status dot */}
            <span className={cn(
                'absolute top-4 right-4 h-2.5 w-2.5 rounded-full',
                agent.active ? 'bg-green-500' : 'bg-slate-300'
            )} title={agent.active ? 'Ativo' : 'Inativo'} />

            {/* Icon + type */}
            <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', info.color)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold truncate">{agent.name}</p>
                    <Badge variant="outline" className={cn('text-[11px] border', info.color)}>
                        {info.label}
                    </Badge>
                </div>
            </div>

            {agent.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
            )}

            {/* Model + files */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {agent.model}
                </span>
                <span>·</span>
                <span>{agent._count.files} arquivo{agent._count.files !== 1 ? 's' : ''}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-1">
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={() => onConfigure(agent)}
                >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configurar
                </Button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={deleting}
                        >
                            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remover agente</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja remover <strong>{agent.name}</strong>? Todos os arquivos da base de conhecimento serão perdidos.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={handleDelete}
                            >
                                Remover
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}

// ─── CreateDialog ──────────────────────────────────────────────────────────────

function CreateDialog({ orgId, open, onClose, onCreate }: {
    orgId: string
    open: boolean
    onClose: () => void
    onCreate: (agent: AiAgent) => void
}) {
    const [name, setName] = useState('')
    const [type, setType] = useState<AgentType>('support')
    const [model, setModel] = useState<AgentModel>('gpt-4o-mini')
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [saving, setSaving] = useState(false)

    function reset() {
        setName(''); setType('support'); setModel('gpt-4o-mini'); setApiKey(''); setShowKey(false)
    }

    async function handleCreate() {
        if (!name.trim()) return toast.error('Nome é obrigatório.')
        setSaving(true)
        try {
            const typeInfo = agentTypeInfo(type)
            const { data } = await api.post('/copilot/agents', {
                orgId,
                name: name.trim(),
                type,
                model,
                apiKey: apiKey.trim() || null,
                systemPrompt: typeInfo.prompt || null,
            })
            onCreate({ ...data, _count: { files: 0 } })
            reset()
            onClose()
            toast.success('Agente criado.')
        } catch {
            toast.error('Erro ao criar agente.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Novo Agente de IA</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="agent-name">Nome *</Label>
                        <Input
                            id="agent-name"
                            placeholder="Ex: Suporte ao Cliente"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Tipo de Agente</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {AGENT_TYPES.map((t) => {
                                const Icon = t.icon
                                return (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setType(t.value)}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left',
                                            type === t.value
                                                ? cn('border-2', t.color)
                                                : 'border hover:bg-muted text-muted-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {t.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Modelo de IA</Label>
                        <Select value={model} onValueChange={(v) => setModel(v as AgentModel)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {AI_MODELS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        <div>
                                            <p className="font-medium">{m.label}</p>
                                            <p className="text-xs text-muted-foreground">{m.desc}</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="agent-apikey">
                            API Key OpenAI
                            <span className="ml-1 text-muted-foreground font-normal text-xs">(opcional — pode configurar depois)</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="agent-apikey"
                                type={showKey ? 'text' : 'password'}
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey((v) => !v)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Criar Agente
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── KnowledgeTab (Base de Conhecimento) ───────────────────────────────────────

function KnowledgeTab({ agentId }: { agentId: string }) {
    const [files, setFiles] = useState<AgentFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [category, setCategory] = useState<FileCategory>('general')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const loadFiles = useCallback(() => {
        setLoading(true)
        api.get(`/copilot/agents/${agentId}/files`)
            .then(({ data }) => setFiles(data))
            .catch(() => setFiles([]))
            .finally(() => setLoading(false))
    }, [agentId])

    useEffect(() => { loadFiles() }, [loadFiles])

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''

        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            toast.error(`Arquivo muito grande. Limite: ${MAX_FILE_MB} MB.`)
            return
        }

        setUploading(true)
        try {
            const content = await fileToBase64(file)
            const { data } = await api.post(`/copilot/agents/${agentId}/files`, {
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                category,
                content,
                sizeBytes: file.size,
            })
            setFiles((prev) => [data, ...prev])
            toast.success('Arquivo enviado.')
        } catch {
            toast.error('Erro ao enviar arquivo.')
        } finally {
            setUploading(false)
        }
    }

    async function handleDelete(fileId: string) {
        setDeletingId(fileId)
        try {
            await api.delete(`/copilot/agents/${agentId}/files/${fileId}`)
            setFiles((prev) => prev.filter((f) => f.id !== fileId))
            toast.success('Arquivo removido.')
        } catch {
            toast.error('Erro ao remover arquivo.')
        } finally {
            setDeletingId(null)
        }
    }

    function FileIcon({ mimeType }: { mimeType: string }) {
        if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
        if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
        return <FileText className="h-4 w-4 text-slate-500" />
    }

    return (
        <div className="space-y-4">
            {/* Upload area */}
            <div className="rounded-lg border-2 border-dashed p-5 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <Select value={category} onValueChange={(v) => setCategory(v as FileCategory)}>
                        <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FILE_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value} className="text-xs">
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Upload className="h-3.5 w-3.5" />
                        }
                        {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                    </Button>

                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    PDF, imagens (PNG/JPG/WEBP), TXT, CSV · Máximo {MAX_FILE_MB} MB por arquivo
                </p>
            </div>

            {/* File list */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Nenhum arquivo adicionado ainda.</p>
                    <p className="text-xs">Adicione PDFs, tabelas e imagens para o agente consultar.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {files.map((f) => {
                        const cat = fileCategoryInfo(f.category as FileCategory)
                        return (
                            <div key={f.id} className="flex items-center gap-3 rounded-lg border px-4 py-2.5">
                                <FileIcon mimeType={f.mimeType} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{f.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</p>
                                </div>
                                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', cat.color)}>
                                    {cat.label}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                    disabled={deletingId === f.id}
                                    onClick={() => handleDelete(f.id)}
                                >
                                    {deletingId === f.id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <X className="h-3.5 w-3.5" />
                                    }
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── ChannelsTab ──────────────────────────────────────────────────────────────

function channelIcon(type: string): React.ElementType {
    if (type === 'whatsapp') return MessageCircle
    if (type === 'api') return Globe
    return Hash
}

function ChannelsTab({ agent, orgId, onSaved }: {
    agent: AiAgent
    orgId: string
    onSaved: (channelIds: string[]) => void
}) {
    const [channels, setChannels] = useState<OrgChannel[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<string[]>(agent.channelIds ?? [])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get('/channels', { params: { orgId } })
            .then(({ data }) => setChannels(data))
            .catch(() => setChannels([]))
            .finally(() => setLoading(false))
    }, [orgId])

    function toggle(id: string) {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        )
    }

    async function handleSave() {
        setSaving(true)
        try {
            await api.patch(`/copilot/agents/${agent.id}`, { channelIds: selected })
            onSaved(selected)
            toast.success('Canais salvos.')
        } catch {
            toast.error('Erro ao salvar canais.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Selecione em quais canais este agente pode agir automaticamente.
            </p>

            {channels.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <Hash className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Nenhum canal criado ainda.</p>
                    <p className="text-xs">Crie canais em <strong>Canais</strong> no menu lateral.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {channels.map((ch) => {
                        const Icon = channelIcon(ch.type)
                        const isOn = selected.includes(ch.id)
                        return (
                            <button
                                key={ch.id}
                                type="button"
                                onClick={() => toggle(ch.id)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                                    isOn ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted'
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{ch.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{ch.type}</p>
                                </div>
                                <span className={cn(
                                    'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                                    ch.status === 'connected'
                                        ? 'bg-green-100 text-green-700'
                                        : ch.status === 'disconnected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-600'
                                )}>
                                    {ch.status === 'connected' ? 'Conectado' : ch.status === 'disconnected' ? 'Desconectado' : 'Pendente'}
                                </span>
                                {isOn
                                    ? <ToggleRight className="h-5 w-5 text-primary shrink-0" />
                                    : <ToggleLeft className="h-5 w-5 text-muted-foreground shrink-0" />
                                }
                            </button>
                        )
                    })}
                </div>
            )}

            {selected.length === 0 && channels.length > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Nenhum canal selecionado — o agente não atuará em nenhuma conversa.
                </p>
            )}

            <Button onClick={handleSave} disabled={saving || channels.length === 0} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar canais ({selected.length} selecionado{selected.length !== 1 ? 's' : ''})
            </Button>
        </div>
    )
}

// ─── ConfigSheet ───────────────────────────────────────────────────────────────

function ConfigSheet({ agent, open, onClose, onUpdated, orgId }: {
    agent: AiAgent | null
    open: boolean
    onClose: () => void
    onUpdated: (updated: AiAgent) => void
    orgId: string
}) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<AgentType>('support')
    const [model, setModel] = useState<AgentModel>('gpt-4o-mini')
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState('')
    const [temperature, setTemperature] = useState(0.7)
    const [active, setActive] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loadingKey, setLoadingKey] = useState(false)

    // Load agent detail (with apiKey) when sheet opens
    useEffect(() => {
        if (!agent || !open) return
        setName(agent.name)
        setDescription(agent.description ?? '')
        setType(agent.type)
        setModel(agent.model)
        setSystemPrompt(agent.systemPrompt ?? '')
        setTemperature(agent.temperature)
        setActive(agent.active)
        setApiKey('')

        // Fetch full agent to get apiKey
        setLoadingKey(true)
        api.get(`/copilot/agents/${agent.id}`)
            .then(({ data }) => setApiKey(data.apiKey ?? ''))
            .catch(() => null)
            .finally(() => setLoadingKey(false))
    }, [agent, open])

    async function handleSave() {
        if (!agent) return
        setSaving(true)
        try {
            const { data } = await api.patch(`/copilot/agents/${agent.id}`, {
                name: name.trim(),
                description: description.trim() || null,
                type,
                model,
                apiKey: apiKey.trim() || null,
                systemPrompt: systemPrompt.trim() || null,
                temperature,
                active,
            })
            onUpdated({ ...data, _count: agent._count })
            toast.success('Agente atualizado.')
        } catch {
            toast.error('Erro ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    function applyTemplate(t: typeof AGENT_TYPES[0]) {
        if (t.prompt) setSystemPrompt(t.prompt)
    }

    if (!agent) return null

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        {agent.name}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="general" className="h-full">
                        <TabsList className="w-full rounded-none border-b h-auto p-0">
                            <TabsTrigger value="general" className="flex-1 rounded-none py-2.5 text-xs">Geral</TabsTrigger>
                            <TabsTrigger value="prompt" className="flex-1 rounded-none py-2.5 text-xs">Prompt</TabsTrigger>
                            <TabsTrigger value="knowledge" className="flex-1 rounded-none py-2.5 text-xs">
                                Base
                                {agent._count.files > 0 && (
                                    <span className="ml-1.5 rounded-full bg-primary/15 text-primary px-1.5 text-[11px] font-medium">
                                        {agent._count.files}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="channels" className="flex-1 rounded-none py-2.5 text-xs">Canais</TabsTrigger>
                        </TabsList>

                        {/* ── Aba Geral ── */}
                        <TabsContent value="general" className="p-6 space-y-4 mt-0">
                            <div className="space-y-1.5">
                                <Label>Nome</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Breve descrição do agente..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Tipo</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AGENT_TYPES.map((t) => {
                                        const Icon = t.icon
                                        return (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setType(t.value)}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left',
                                                    type === t.value
                                                        ? cn('border-2', t.color)
                                                        : 'border hover:bg-muted text-muted-foreground'
                                                )}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                {t.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Modelo de IA</Label>
                                <Select value={model} onValueChange={(v) => setModel(v as AgentModel)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AI_MODELS.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                <div>
                                                    <p className="font-medium">{m.label}</p>
                                                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>API Key OpenAI</Label>
                                <div className="relative">
                                    {loadingKey ? (
                                        <div className="flex items-center h-9 px-3 rounded-md border bg-muted">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : (
                                        <Input
                                            type={showKey ? 'text' : 'password'}
                                            placeholder="sk-..."
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="pr-10"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((v) => !v)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Obtenha em <span className="font-mono">platform.openai.com/api-keys</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Temperatura <span className="text-muted-foreground font-normal">(criatividade)</span></Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                        className="flex-1"
                                    />
                                    <span className="text-sm font-mono w-8 text-right">{temperature.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>Preciso</span>
                                    <span>Criativo</span>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Agente ativo</p>
                                    <p className="text-xs text-muted-foreground">Desativar sem excluir o agente</p>
                                </div>
                                <Switch checked={active} onCheckedChange={setActive} />
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Salvar alterações
                            </Button>
                        </TabsContent>

                        {/* ── Aba Prompt ── */}
                        <TabsContent value="prompt" className="p-6 space-y-4 mt-0">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Prompt do Sistema</Label>
                                    <span className="text-xs text-muted-foreground">{systemPrompt.length} caracteres</span>
                                </div>
                                <Textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    placeholder="Descreva o comportamento, tom e instruções do agente..."
                                    className="min-h-48 resize-none text-sm font-mono"
                                />
                            </div>

                            {/* Templates */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Templates por tipo
                                </p>
                                <div className="grid gap-2">
                                    {AGENT_TYPES.filter((t) => t.prompt).map((t) => {
                                        const Icon = t.icon
                                        return (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => applyTemplate(t)}
                                                className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted transition-colors"
                                            >
                                                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md border', t.color)}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium">{t.label}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{t.prompt}</p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Salvar prompt
                            </Button>
                        </TabsContent>

                        {/* ── Aba Base de Conhecimento ── */}
                        <TabsContent value="knowledge" className="p-6 mt-0">
                            <KnowledgeTab agentId={agent.id} />
                        </TabsContent>

                        {/* ── Aba Canais ── */}
                        <TabsContent value="channels" className="p-6 mt-0">
                            <ChannelsTab
                                agent={agent}
                                orgId={orgId}
                                onSaved={(ids) => onUpdated({ ...agent, channelIds: ids })}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CopilotPage() {
    const { data: perms } = usePermissions()
    const orgId = useOrgId()
    const [agents, setAgents] = useState<AiAgent[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [configured, setConfigured] = useState<AiAgent | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)

    const loadAgents = useCallback(async (id: string) => {
        setLoading(true)
        try {
            const { data } = await api.get('/copilot/agents', { params: { orgId: id } })
            setAgents(data)
        } catch {
            setAgents([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (orgId) loadAgents(orgId)
    }, [orgId, loadAgents])

    function handleConfigure(agent: AiAgent) {
        setConfigured(agent)
        setSheetOpen(true)
    }

    function handleCreated(agent: AiAgent) {
        setAgents((prev) => [agent, ...prev])
        // Auto-open config sheet for new agent
        setConfigured(agent)
        setSheetOpen(true)
    }

    function handleDeleted(id: string) {
        setAgents((prev) => prev.filter((a) => a.id !== id))
        if (configured?.id === id) { setSheetOpen(false); setConfigured(null) }
    }

    function handleUpdated(updated: AiAgent) {
        setAgents((prev) => prev.map((a) => a.id === updated.id ? updated : a))
        setConfigured(updated)
    }

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (perms && !perms.permissions.canManageAgents) return <NoPermission />

    return (
        <div className="flex flex-1 flex-col overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b shrink-0">
                <div>
                    <h1 className="text-xl font-semibold">Agentes de IA</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Configure assistentes inteligentes para suporte, vendas e mais.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Novo Agente
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 px-8 py-6">
                {agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Bot className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold">Nenhum agente criado</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Crie seu primeiro agente de IA para começar a automatizar atendimentos.
                            </p>
                        </div>
                        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Criar Primeiro Agente
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {agents.map((agent) => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                onConfigure={handleConfigure}
                                onDeleted={handleDeleted}
                            />
                        ))}

                        {/* Add card */}
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-muted-foreground hover:text-foreground hover:border-border transition-colors min-h-[180px]"
                        >
                            <Plus className="h-6 w-6" />
                            <span className="text-sm font-medium">Novo Agente</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            {orgId && (
                <CreateDialog
                    orgId={orgId}
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    onCreate={handleCreated}
                />
            )}

            <ConfigSheet
                agent={configured}
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                onUpdated={handleUpdated}
                orgId={orgId ?? ''}
            />
        </div>
    )
}
