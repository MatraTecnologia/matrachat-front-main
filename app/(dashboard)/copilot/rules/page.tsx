'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    Zap, Plus, Trash2, Edit2, Loader2, Bot, ArrowRight,
    MessageSquare, Clock, Hash, AlarmClock, Infinity,
    UserCheck, Bot as BotIcon, VolumeX, Send, Tag,
    ChevronRight, ToggleLeft, ToggleRight,
    Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
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

type ConditionType = 'keyword_match' | 'message_count' | 'no_ai_response' | 'hours_outside' | 'always'
type ActionType    = 'transfer_human' | 'assign_agent' | 'stop_responding' | 'send_message' | 'add_tag'

type AgentRule = {
    id: string
    agentId: string
    name: string
    active: boolean
    priority: number
    conditionType: ConditionType
    conditionValue: Record<string, unknown> | null
    actionType: ActionType
    actionValue: Record<string, unknown> | null
    createdAt: string
    agent?: { id: string; name: string; type: string }
}

type AiAgent = {
    id: string
    name: string
    type: string
    active: boolean
}

type OrgMember = {
    id: string
    role: string
    user: { id: string; name: string }
}

type OrgTag = {
    id: string
    name: string
    color: string
}

// ─── Condition metadata ────────────────────────────────────────────────────────

const CONDITIONS: { value: ConditionType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    {
        value: 'keyword_match',
        label: 'Contém palavras-chave',
        desc: 'Ativa quando a mensagem contém termos específicos',
        icon: MessageSquare,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
        value: 'message_count',
        label: 'Após N mensagens',
        desc: 'Ativa após um número de mensagens trocadas',
        icon: Hash,
        color: 'text-violet-600 bg-violet-50 border-violet-200',
    },
    {
        value: 'no_ai_response',
        label: 'IA sem responder',
        desc: 'Ativa quando a IA não responde por N minutos',
        icon: AlarmClock,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
        value: 'hours_outside',
        label: 'Fora do horário',
        desc: 'Ativa quando fora do horário comercial configurado',
        icon: Clock,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
    },
    {
        value: 'always',
        label: 'Sempre',
        desc: 'Ativa em toda nova conversa iniciada',
        icon: Infinity,
        color: 'text-slate-600 bg-slate-50 border-slate-200',
    },
]

const ACTIONS: { value: ActionType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    {
        value: 'transfer_human',
        label: 'Transferir para humano',
        desc: 'Encaminha a conversa para um atendente',
        icon: UserCheck,
        color: 'text-green-600 bg-green-50 border-green-200',
    },
    {
        value: 'assign_agent',
        label: 'Transferir para outro agente',
        desc: 'Passa o controle para outro agente de IA',
        icon: BotIcon,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
        value: 'stop_responding',
        label: 'Parar de responder',
        desc: 'O agente para de responder a esta conversa',
        icon: VolumeX,
        color: 'text-red-600 bg-red-50 border-red-200',
    },
    {
        value: 'send_message',
        label: 'Enviar mensagem',
        desc: 'Envia uma mensagem automática ao contato',
        icon: Send,
        color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
    {
        value: 'add_tag',
        label: 'Adicionar tag',
        desc: 'Aplica uma tag à conversa ou contato',
        icon: Tag,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
]

function conditionInfo(type: ConditionType) {
    return CONDITIONS.find((c) => c.value === type) ?? CONDITIONS[CONDITIONS.length - 1]
}

function actionInfo(type: ActionType) {
    return ACTIONS.find((a) => a.value === type) ?? ACTIONS[ACTIONS.length - 1]
}

function conditionLabel(rule: AgentRule): string {
    const v = rule.conditionValue as Record<string, unknown> | null
    switch (rule.conditionType) {
        case 'keyword_match': {
            const kws = (v?.keywords as string[]) ?? []
            return kws.length ? `"${kws.slice(0, 2).join('", "')}"${kws.length > 2 ? ` +${kws.length - 2}` : ''}` : '—'
        }
        case 'message_count':
            return `${v?.count ?? '?'} mensagens`
        case 'no_ai_response':
            return `${v?.minutes ?? '?'} min sem resposta`
        case 'hours_outside':
            return `Fora de ${v?.start ?? '?'}–${v?.end ?? '?'}`
        case 'always':
            return 'A cada nova conversa'
        default:
            return '—'
    }
}

function actionLabel(rule: AgentRule, agents: AiAgent[], tags: OrgTag[]): string {
    const v = rule.actionValue as Record<string, unknown> | null
    switch (rule.actionType) {
        case 'transfer_human':
            return v?.memberId ? 'Para atendente específico' : 'Para fila geral'
        case 'assign_agent': {
            const ag = agents.find((a) => a.id === v?.agentId)
            return ag ? ag.name : '—'
        }
        case 'stop_responding':
            return 'Para de responder'
        case 'send_message':
            return (v?.message as string)?.slice(0, 40) + ((v?.message as string)?.length > 40 ? '…' : '') || '—'
        case 'add_tag': {
            const tag = tags.find((t) => t.id === v?.tagId)
            return tag ? tag.name : '—'
        }
        default:
            return '—'
    }
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

// ─── RuleCard ──────────────────────────────────────────────────────────────────

function RuleCard({
    rule, agents, tags, onEdit, onDeleted, onToggle,
}: {
    rule: AgentRule
    agents: AiAgent[]
    tags: OrgTag[]
    onEdit: (r: AgentRule) => void
    onDeleted: (id: string) => void
    onToggle: (r: AgentRule) => void
}) {
    const [deleting, setDeleting] = useState(false)
    const [toggling, setToggling] = useState(false)
    const cond = conditionInfo(rule.conditionType)
    const act  = actionInfo(rule.actionType)
    const CondIcon = cond.icon
    const ActIcon  = act.icon

    async function handleDelete() {
        setDeleting(true)
        try {
            await api.delete(`/copilot/rules/${rule.id}`)
            onDeleted(rule.id)
            toast.success('Regra removida.')
        } catch {
            toast.error('Erro ao remover regra.')
        } finally {
            setDeleting(false)
        }
    }

    async function handleToggle() {
        setToggling(true)
        try {
            const { data } = await api.patch(`/copilot/rules/${rule.id}`, { active: !rule.active })
            onToggle(data)
        } catch {
            toast.error('Erro ao atualizar regra.')
        } finally {
            setToggling(false)
        }
    }

    return (
        <div className={cn(
            'rounded-xl border bg-card shadow-sm transition-all',
            !rule.active && 'opacity-60'
        )}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Zap className={cn('h-4 w-4 shrink-0', rule.active ? 'text-primary' : 'text-muted-foreground')} />
                <span className="flex-1 font-medium text-sm truncate">{rule.name}</span>
                <Badge variant="outline" className="text-[11px] shrink-0">
                    P{rule.priority}
                </Badge>
                <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    {toggling
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : rule.active
                            ? <ToggleRight className="h-5 w-5 text-primary" />
                            : <ToggleLeft className="h-5 w-5" />
                    }
                </button>
            </div>

            {/* Flow visualization */}
            <div className="flex items-center gap-2 px-4 py-3">
                {/* WHEN */}
                <div className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2',
                    cond.color
                )}>
                    <CondIcon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">QUANDO</p>
                        <p className="text-xs font-medium truncate">{cond.label}</p>
                        <p className="text-[11px] opacity-70 truncate">{conditionLabel(rule)}</p>
                    </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

                {/* THEN */}
                <div className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2',
                    act.color
                )}>
                    <ActIcon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">ENTÃO</p>
                        <p className="text-xs font-medium truncate">{act.label}</p>
                        <p className="text-[11px] opacity-70 truncate">{actionLabel(rule, agents, tags)}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(rule)}
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={deleting}
                            >
                                {deleting
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Trash2 className="h-3.5 w-3.5" />
                                }
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remover regra</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tem certeza que deseja remover <strong>{rule.name}</strong>?
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
        </div>
    )
}

// ─── RuleDialog ────────────────────────────────────────────────────────────────

function RuleDialog({
    open,
    onClose,
    agents,
    members,
    tags,
    initial,
    defaultAgentId,
    onSaved,
}: {
    open: boolean
    onClose: () => void
    agents: AiAgent[]
    members: OrgMember[]
    tags: OrgTag[]
    initial: AgentRule | null
    defaultAgentId: string
    onSaved: (rule: AgentRule) => void
}) {
    const [step, setStep] = useState(1)
    const [agentId, setAgentId]         = useState(defaultAgentId)
    const [name, setName]               = useState('')
    const [priority, setPriority]       = useState(0)
    const [condType, setCondType]       = useState<ConditionType>('keyword_match')
    const [keywords, setKeywords]       = useState('')
    const [msgCount, setMsgCount]       = useState('5')
    const [minutes, setMinutes]         = useState('10')
    const [hourStart, setHourStart]     = useState('08:00')
    const [hourEnd, setHourEnd]         = useState('18:00')
    const [actType, setActType]         = useState<ActionType>('transfer_human')
    const [actMemberId, setActMemberId] = useState('')
    const [actAgentId, setActAgentId]   = useState('')
    const [actMessage, setActMessage]   = useState('')
    const [actTagId, setActTagId]       = useState('')
    const [saving, setSaving]           = useState(false)

    useEffect(() => {
        if (!open) { setStep(1); return }
        if (initial) {
            const cv = initial.conditionValue as Record<string, unknown> | null
            const av = initial.actionValue as Record<string, unknown> | null
            setAgentId(initial.agentId)
            setName(initial.name)
            setPriority(initial.priority)
            setCondType(initial.conditionType)
            setKeywords(((cv?.keywords as string[]) ?? []).join(', '))
            setMsgCount(String(cv?.count ?? 5))
            setMinutes(String(cv?.minutes ?? 10))
            setHourStart(String(cv?.start ?? '08:00'))
            setHourEnd(String(cv?.end ?? '18:00'))
            setActType(initial.actionType)
            setActMemberId(String(av?.memberId ?? ''))
            setActAgentId(String(av?.agentId ?? ''))
            setActMessage(String(av?.message ?? ''))
            setActTagId(String(av?.tagId ?? ''))
        } else {
            setAgentId(defaultAgentId)
            setName('')
            setPriority(0)
            setCondType('keyword_match')
            setKeywords('')
            setMsgCount('5')
            setMinutes('10')
            setHourStart('08:00')
            setHourEnd('18:00')
            setActType('transfer_human')
            setActMemberId('')
            setActAgentId('')
            setActMessage('')
            setActTagId('')
        }
    }, [open, initial, defaultAgentId])

    function buildConditionValue(): Record<string, unknown> | null {
        switch (condType) {
            case 'keyword_match':
                return { keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) }
            case 'message_count':
                return { count: parseInt(msgCount) || 5 }
            case 'no_ai_response':
                return { minutes: parseInt(minutes) || 10 }
            case 'hours_outside':
                return { start: hourStart, end: hourEnd }
            case 'always':
                return null
        }
    }

    function buildActionValue(): Record<string, unknown> | null {
        switch (actType) {
            case 'transfer_human':
                return actMemberId ? { memberId: actMemberId } : null
            case 'assign_agent':
                return { agentId: actAgentId }
            case 'send_message':
                return { message: actMessage }
            case 'add_tag':
                return { tagId: actTagId }
            case 'stop_responding':
                return null
        }
    }

    function canAdvance(): boolean {
        if (step === 1) return !!agentId && !!name.trim()
        if (step === 2) {
            if (condType === 'keyword_match') return keywords.trim().length > 0
            return true
        }
        if (step === 3) {
            if (actType === 'assign_agent') return !!actAgentId
            if (actType === 'send_message') return !!actMessage.trim()
            if (actType === 'add_tag') return !!actTagId
            return true
        }
        return true
    }

    async function handleSave() {
        setSaving(true)
        try {
            const body = {
                name: name.trim(),
                priority,
                conditionType: condType,
                conditionValue: buildConditionValue(),
                actionType: actType,
                actionValue: buildActionValue(),
                active: initial?.active ?? true,
            }
            let data: AgentRule
            if (initial) {
                const res = await api.patch(`/copilot/rules/${initial.id}`, body)
                data = res.data
            } else {
                const res = await api.post(`/copilot/agents/${agentId}/rules`, body)
                data = res.data
            }
            onSaved(data)
            toast.success(initial ? 'Regra atualizada.' : 'Regra criada.')
            onClose()
        } catch {
            toast.error('Erro ao salvar regra.')
        } finally {
            setSaving(false)
        }
    }

    const stepLabels = ['Agente & Nome', 'Condição (QUANDO)', 'Ação (ENTÃO)']

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        {initial ? 'Editar Regra' : 'Nova Regra de Automação'}
                    </DialogTitle>
                </DialogHeader>

                {/* Steps indicator */}
                <div className="flex items-center gap-1 -mt-1">
                    {stepLabels.map((label, i) => {
                        const n = i + 1
                        const done = step > n
                        const active = step === n
                        return (
                            <div key={n} className={cn('flex items-center gap-1', i > 0 && 'flex-1')}>
                                {i > 0 && <div className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} />}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn(
                                        'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                                        done ? 'bg-primary text-primary-foreground'
                                            : active ? 'bg-primary/15 text-primary border border-primary'
                                            : 'bg-muted text-muted-foreground'
                                    )}>
                                        {done ? '✓' : n}
                                    </span>
                                    <span className={cn(
                                        'text-xs hidden sm:inline',
                                        active ? 'text-foreground font-medium' : 'text-muted-foreground'
                                    )}>
                                        {label}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Step 1: Agent + Name */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Agente *</Label>
                            <Select value={agentId} onValueChange={setAgentId} disabled={!!initial}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o agente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            <div className="flex items-center gap-2">
                                                <Bot className="h-4 w-4 text-muted-foreground" />
                                                {a.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Nome da Regra *</Label>
                            <Input
                                placeholder="Ex: Transferir quando pede humano"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && setStep(2)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Prioridade <span className="text-muted-foreground font-normal text-xs">(maior = executada primeiro)</span></Label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                                className="w-28"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Condition */}
                {step === 2 && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Quando isso acontecer, a regra será ativada:</p>
                        <div className="grid gap-2">
                            {CONDITIONS.map((c) => {
                                const Icon = c.icon
                                return (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setCondType(c.value)}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                                            condType === c.value
                                                ? cn('border-2', c.color)
                                                : 'hover:bg-muted'
                                        )}
                                    >
                                        <span className={cn(
                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                                            condType === c.value ? c.color : 'bg-muted text-muted-foreground border-transparent'
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">{c.label}</p>
                                            <p className="text-xs text-muted-foreground">{c.desc}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Condition-specific fields */}
                        <div className="rounded-lg bg-muted/50 p-4 space-y-3 border">
                            {condType === 'keyword_match' && (
                                <div className="space-y-1.5">
                                    <Label>Palavras-chave <span className="text-muted-foreground font-normal text-xs">(separadas por vírgula)</span></Label>
                                    <Input
                                        placeholder="falar com atendente, humano, ajuda"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                    />
                                </div>
                            )}
                            {condType === 'message_count' && (
                                <div className="space-y-1.5">
                                    <Label>Número de mensagens</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={msgCount}
                                        onChange={(e) => setMsgCount(e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                            )}
                            {condType === 'no_ai_response' && (
                                <div className="space-y-1.5">
                                    <Label>Minutos sem resposta</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={minutes}
                                        onChange={(e) => setMinutes(e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                            )}
                            {condType === 'hours_outside' && (
                                <div className="flex items-center gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Início</Label>
                                        <Input
                                            type="time"
                                            value={hourStart}
                                            onChange={(e) => setHourStart(e.target.value)}
                                            className="w-32"
                                        />
                                    </div>
                                    <span className="mt-6 text-muted-foreground">–</span>
                                    <div className="space-y-1.5">
                                        <Label>Fim</Label>
                                        <Input
                                            type="time"
                                            value={hourEnd}
                                            onChange={(e) => setHourEnd(e.target.value)}
                                            className="w-32"
                                        />
                                    </div>
                                </div>
                            )}
                            {condType === 'always' && (
                                <p className="text-sm text-muted-foreground">Esta regra será ativada sempre que uma nova conversa iniciar.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Action */}
                {step === 3 && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Quando a condição for atendida, faça isso:</p>
                        <div className="grid gap-2">
                            {ACTIONS.map((a) => {
                                const Icon = a.icon
                                return (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => setActType(a.value)}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                                            actType === a.value
                                                ? cn('border-2', a.color)
                                                : 'hover:bg-muted'
                                        )}
                                    >
                                        <span className={cn(
                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                                            actType === a.value ? a.color : 'bg-muted text-muted-foreground border-transparent'
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">{a.label}</p>
                                            <p className="text-xs text-muted-foreground">{a.desc}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Action-specific fields */}
                        <div className="rounded-lg bg-muted/50 p-4 space-y-3 border">
                            {actType === 'transfer_human' && (
                                <div className="space-y-1.5">
                                    <Label>Atendente específico <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                                    <Select value={actMemberId || '__any__'} onValueChange={(v) => setActMemberId(v === '__any__' ? '' : v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Qualquer atendente disponível" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__any__">Qualquer atendente disponível</SelectItem>
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.user.id}>
                                                    {m.user.name} ({m.role})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {actType === 'assign_agent' && (
                                <div className="space-y-1.5">
                                    <Label>Agente de destino *</Label>
                                    <Select value={actAgentId} onValueChange={setActAgentId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o agente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agents.map((a) => (
                                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {actType === 'send_message' && (
                                <div className="space-y-1.5">
                                    <Label>Mensagem *</Label>
                                    <Textarea
                                        placeholder="Olá! Nosso horário de atendimento é das 8h às 18h..."
                                        value={actMessage}
                                        onChange={(e) => setActMessage(e.target.value)}
                                        className="resize-none text-sm min-h-24"
                                    />
                                </div>
                            )}
                            {actType === 'add_tag' && (
                                <div className="space-y-1.5">
                                    <Label>Tag *</Label>
                                    <Select value={actTagId} onValueChange={setActTagId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a tag..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tags.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                                                        {t.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {actType === 'stop_responding' && (
                                <p className="text-sm text-muted-foreground">O agente parará de responder a esta conversa até que seja reiniciada manualmente.</p>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                        {step > 1 && (
                            <Button variant="outline" onClick={() => setStep(step - 1)}>
                                Voltar
                            </Button>
                        )}
                    </div>
                    {step < 3 ? (
                        <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
                            Próximo
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button onClick={handleSave} disabled={saving || !canAdvance()}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {initial ? 'Salvar alterações' : 'Criar Regra'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RulesPage() {
    const { data: perms } = usePermissions()
    const orgId = useOrgId()

    const [agents, setAgents]   = useState<AiAgent[]>([])
    const [rules, setRules]     = useState<AgentRule[]>([])
    const [members, setMembers] = useState<OrgMember[]>([])
    const [tags, setTags]       = useState<OrgTag[]>([])
    const [loading, setLoading] = useState(true)

    const [filterAgentId, setFilterAgentId] = useState<string>('all')
    const [dialogOpen, setDialogOpen]       = useState(false)
    const [editingRule, setEditingRule]     = useState<AgentRule | null>(null)

    const loadAll = useCallback(async (id: string) => {
        setLoading(true)
        try {
            const [agentsRes, membersRes, tagsRes] = await Promise.all([
                api.get('/copilot/agents',           { params: { orgId: id } }),
                api.get(`/organizations/${id}/members`),
                api.get('/tags',                     { params: { orgId: id } }),
            ])
            const agentList: AiAgent[] = agentsRes.data
            setAgents(agentList)
            setMembers(membersRes.data)
            setTags(tagsRes.data)

            // Load rules for all agents in parallel
            if (agentList.length > 0) {
                const ruleResults = await Promise.all(
                    agentList.map((a) =>
                        api.get(`/copilot/agents/${a.id}/rules`)
                            .then(({ data }) => data.map((r: AgentRule) => ({ ...r, agent: a })))
                            .catch(() => [])
                    )
                )
                setRules(ruleResults.flat())
            }
        } catch {
            toast.error('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (orgId) loadAll(orgId)
    }, [orgId, loadAll])

    const filteredRules = filterAgentId === 'all'
        ? rules
        : rules.filter((r) => r.agentId === filterAgentId)

    // Group by agent
    const grouped = agents.reduce<Record<string, AgentRule[]>>((acc, agent) => {
        const agentRules = filteredRules.filter((r) => r.agentId === agent.id)
            .sort((a, b) => b.priority - a.priority)
        if (agentRules.length > 0 || filterAgentId === agent.id) {
            acc[agent.id] = agentRules
        }
        return acc
    }, {})

    function handleSaved(saved: AgentRule) {
        setRules((prev) => {
            const agent = agents.find((a) => a.id === saved.agentId)
            const enriched = { ...saved, agent: agent ?? saved.agent }
            const idx = prev.findIndex((r) => r.id === enriched.id)
            return idx >= 0
                ? prev.map((r) => r.id === enriched.id ? enriched : r)
                : [enriched, ...prev]
        })
    }

    function handleDeleted(id: string) {
        setRules((prev) => prev.filter((r) => r.id !== id))
    }

    function handleToggle(updated: AgentRule) {
        setRules((prev) => prev.map((r) => r.id === updated.id ? { ...r, active: updated.active } : r))
    }

    function openCreate() {
        setEditingRule(null)
        setDialogOpen(true)
    }

    function openEdit(rule: AgentRule) {
        setEditingRule(rule)
        setDialogOpen(true)
    }

    const defaultAgentId = filterAgentId !== 'all' ? filterAgentId : (agents[0]?.id ?? '')

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
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Regras de Automação
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Defina quando os agentes devem transferir, escalar ou agir automaticamente.
                    </p>
                </div>
                <Button onClick={openCreate} disabled={agents.length === 0} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Nova Regra
                </Button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3 px-8 py-3 border-b bg-muted/30 shrink-0">
                <span className="text-sm text-muted-foreground">Agente:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => setFilterAgentId('all')}
                        className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                            filterAgentId === 'all'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground hover:bg-muted border-border'
                        )}
                    >
                        Todos ({rules.length})
                    </button>
                    {agents.map((a) => {
                        const count = rules.filter((r) => r.agentId === a.id).length
                        return (
                            <button
                                key={a.id}
                                onClick={() => setFilterAgentId(a.id)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                                    filterAgentId === a.id
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground hover:bg-muted border-border'
                                )}
                            >
                                {a.name} ({count})
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-8 py-6 overflow-auto">
                {agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Bot className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold">Nenhum agente criado</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Primeiro crie um agente de IA em <strong>Capitão / Copiloto → Agentes</strong>.
                            </p>
                        </div>
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Sparkles className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold">Nenhuma regra configurada</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Crie sua primeira regra para automatizar o comportamento dos agentes.
                            </p>
                        </div>
                        <Button onClick={openCreate} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Criar Primeira Regra
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {agents
                            .filter((a) => grouped[a.id] !== undefined)
                            .map((agent) => (
                                <div key={agent.id} className="space-y-3">
                                    {/* Agent header */}
                                    <div className="flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">{agent.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            — {grouped[agent.id].length} regra{grouped[agent.id].length !== 1 ? 's' : ''}
                                        </span>
                                        <div className="flex-1 h-px bg-border ml-2" />
                                        <button
                                            onClick={() => {
                                                setFilterAgentId(agent.id)
                                                openCreate()
                                            }}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Adicionar
                                        </button>
                                    </div>

                                    {/* Rules */}
                                    <div className="space-y-2">
                                        {grouped[agent.id].map((rule) => (
                                            <RuleCard
                                                key={rule.id}
                                                rule={rule}
                                                agents={agents}
                                                tags={tags}
                                                onEdit={openEdit}
                                                onDeleted={handleDeleted}
                                                onToggle={handleToggle}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Dialog */}
            <RuleDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                agents={agents}
                members={members}
                tags={tags}
                initial={editingRule}
                defaultAgentId={defaultAgentId}
                onSaved={handleSaved}
            />
        </div>
    )
}
