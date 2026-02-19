'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    BarChart2,
    MessageSquare,
    MessageCircleMore,
    Send,
    Users,
    UserPlus,
    CheckCircle2,
    Clock,
    Circle,
    TrendingUp,
    RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'
import { cn } from '@/lib/utils'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d'

type OverviewData = {
    period: string
    since: string
    messages: { total: number; inbound: number; outbound: number }
    contacts: { new: number; total: number }
    conversations: { open: number; pending: number; resolved: number; total: number }
}

type AgentStat = {
    userId: string
    name: string
    email: string
    image: string | null
    role: string
    assignedContacts: number
    resolvedContacts: number
    messagesSent: number
}

type AgentsData = { period: string; agents: AgentStat[] }

type TimelinePoint = { day: string; inbound: number; outbound: number }
type TimelineData = { period: string; timeline: TimelinePoint[] }

type ChannelStat = { id: string; name: string; type: string; messages: number }
type ChannelsData = { period: string; channels: ChannelStat[] }

// ── Helpers ────────────────────────────────────────────────────────────────────

function periodLabel(p: Period) {
    return p === '7d' ? 'Últimos 7 dias' : p === '30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'
}

function fmtDay(iso: string) {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
}

function initials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
    icon: Icon,
    label,
    value,
    sub,
    color = 'text-primary',
    loading,
}: {
    icon: React.ElementType
    label: string
    value: number | string
    sub?: string
    color?: string
    loading: boolean
}) {
    return (
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-muted', color)}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            {loading ? (
                <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ) : (
                <span className="text-3xl font-bold tracking-tight">{value}</span>
            )}
            {sub && !loading && (
                <span className="text-xs text-muted-foreground">{sub}</span>
            )}
        </div>
    )
}

// ── Página de Relatórios ───────────────────────────────────────────────────────

export default function ReportsPage() {
    const { data: perms } = usePermissions()
    const [orgId, setOrgId]       = useState<string | null>(null)
    const [period, setPeriod]     = useState<Period>('30d')

    const [overview, setOverview] = useState<OverviewData | null>(null)
    const [agents, setAgents]     = useState<AgentsData | null>(null)
    const [timeline, setTimeline] = useState<TimelineData | null>(null)
    const [channels, setChannels] = useState<ChannelsData | null>(null)

    const [loading, setLoading]   = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // ── Carrega orgId ──────────────────────────────────────────────────────────
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => {
                if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id)
            })
            .catch(() => null)
    }, [])

    // ── Carrega todos os dados ─────────────────────────────────────────────────
    const load = useCallback(async (oId: string, p: Period, isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const params = { period: p }
            const [ovRes, agRes, tlRes, chRes] = await Promise.all([
                api.get('/reports',          { params }),
                api.get('/reports/agents',   { params }),
                api.get('/reports/timeline', { params }),
                api.get('/reports/channels', { params }),
            ])
            setOverview(ovRes.data)
            setAgents(agRes.data)
            setTimeline(tlRes.data)
            setChannels(chRes.data)
        } catch {
            // silently fail — mantém dados anteriores em caso de erro
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        if (orgId) load(orgId, period)
    }, [orgId, period, load])

    // ── Max para barra de canais ───────────────────────────────────────────────
    const maxChannelMsg = Math.max(...(channels?.channels.map((c) => c.messages) ?? [1]), 1)
    const maxAgentMsg   = Math.max(...(agents?.agents.map((a) => a.messagesSent) ?? [1]), 1)

    if (perms && !perms.permissions.canViewDashboard) return <NoPermission />

    return (
        <div className="flex flex-1 flex-col overflow-auto bg-background">

            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BarChart2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Relatórios</h1>
                        <p className="text-xs text-muted-foreground">{periodLabel(period)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botão de refresh */}
                    <button
                        onClick={() => orgId && load(orgId, period, true)}
                        disabled={refreshing || loading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                    </button>

                    {/* Seletor de período */}
                    <div className="flex items-center rounded-lg border bg-background p-0.5">
                        {(['7d', '30d', '90d'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                    period === p
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Conteúdo ── */}
            <div className="flex flex-col gap-6 p-6">

                {/* ── KPIs de mensagens ── */}
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Mensagens
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <KpiCard
                            icon={MessageSquare}
                            label="Total"
                            value={overview?.messages.total ?? 0}
                            sub="todas as mensagens no período"
                            color="text-violet-500"
                            loading={loading}
                        />
                        <KpiCard
                            icon={MessageCircleMore}
                            label="Recebidas"
                            value={overview?.messages.inbound ?? 0}
                            sub="mensagens dos contatos"
                            color="text-blue-500"
                            loading={loading}
                        />
                        <KpiCard
                            icon={Send}
                            label="Enviadas"
                            value={overview?.messages.outbound ?? 0}
                            sub="mensagens da equipe"
                            color="text-emerald-500"
                            loading={loading}
                        />
                        <KpiCard
                            icon={TrendingUp}
                            label="Taxa de resposta"
                            value={
                                overview && overview.messages.inbound > 0
                                    ? `${Math.round((overview.messages.outbound / overview.messages.inbound) * 100)}%`
                                    : '—'
                            }
                            sub="enviadas / recebidas"
                            color="text-orange-500"
                            loading={loading}
                        />
                    </div>
                </section>

                {/* ── KPIs de conversas + contatos ── */}
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Conversas & Contatos
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <KpiCard
                            icon={Circle}
                            label="Abertas"
                            value={overview?.conversations.open ?? 0}
                            color="text-blue-500"
                            loading={loading}
                        />
                        <KpiCard
                            icon={Clock}
                            label="Pendentes"
                            value={overview?.conversations.pending ?? 0}
                            color="text-yellow-500"
                            loading={loading}
                        />
                        <KpiCard
                            icon={CheckCircle2}
                            label="Resolvidas"
                            value={overview?.conversations.resolved ?? 0}
                            color="text-emerald-500"
                            loading={loading}
                        />
                        <KpiCard
                            icon={UserPlus}
                            label="Novos contatos"
                            value={overview?.contacts.new ?? 0}
                            sub="no período"
                            color="text-primary"
                            loading={loading}
                        />
                        <KpiCard
                            icon={Users}
                            label="Total contatos"
                            value={overview?.contacts.total ?? 0}
                            color="text-muted-foreground"
                            loading={loading}
                        />
                    </div>
                </section>

                {/* ── Gráfico de timeline ── */}
                <section>
                    <div className="rounded-xl border bg-card p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold">Volume de mensagens por dia</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Mensagens recebidas e enviadas ao longo do período
                            </p>
                        </div>
                        {loading ? (
                            <div className="h-52 w-full animate-pulse rounded-lg bg-muted" />
                        ) : !timeline?.timeline.length ? (
                            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                                Sem dados para o período selecionado
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart
                                    data={timeline.timeline.map((d) => ({
                                        ...d,
                                        day: fmtDay(d.day),
                                    }))}
                                    margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                                >
                                    <defs>
                                        <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                        labelStyle={{ fontWeight: 600 }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                                        formatter={(v) => v === 'inbound' ? 'Recebidas' : 'Enviadas'}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="inbound"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="url(#gradIn)"
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="outbound"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#gradOut)"
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                {/* ── Agentes + Canais (lado a lado) ── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                    {/* Tabela de agentes — ocupa 2/3 */}
                    <section className="lg:col-span-2">
                        <div className="rounded-xl border bg-card">
                            <div className="border-b px-5 py-4">
                                <h2 className="text-sm font-semibold">Performance por agente</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Quem mais respondeu e resolveu conversas no período
                                </p>
                            </div>

                            {loading ? (
                                <div className="flex flex-col gap-3 p-5">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                                                <div className="h-2.5 w-48 animate-pulse rounded bg-muted" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : !agents?.agents.length ? (
                                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground p-5">
                                    Nenhum agente encontrado
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {/* Header */}
                                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                        <span>Agente</span>
                                        <span className="text-right w-24">Msgs enviadas</span>
                                        <span className="text-right w-20">Atribuídos</span>
                                        <span className="text-right w-20">Resolvidos</span>
                                    </div>
                                    {agents.agents.map((agent, idx) => (
                                        <div
                                            key={agent.userId}
                                            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-muted/30 transition-colors"
                                        >
                                            {/* Info do agente */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                        {initials(agent.name)}
                                                    </div>
                                                    {idx === 0 && (
                                                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-400 text-[8px] font-bold text-yellow-900">
                                                            1
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium leading-tight">{agent.name}</p>
                                                    <p className="truncate text-[11px] text-muted-foreground">{agent.email}</p>
                                                </div>
                                            </div>

                                            {/* Mensagens enviadas com mini-barra */}
                                            <div className="flex w-24 flex-col items-end gap-1">
                                                <span className="text-sm font-semibold tabular-nums">{agent.messagesSent}</span>
                                                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                                        style={{ width: `${(agent.messagesSent / maxAgentMsg) * 100}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Atribuídos */}
                                            <div className="w-20 text-right">
                                                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                                                    {agent.assignedContacts}
                                                </span>
                                            </div>

                                            {/* Resolvidos */}
                                            <div className="w-20 text-right">
                                                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                                    {agent.resolvedContacts}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Canais — ocupa 1/3 */}
                    <section>
                        <div className="rounded-xl border bg-card h-full">
                            <div className="border-b px-5 py-4">
                                <h2 className="text-sm font-semibold">Por canal</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Mensagens por canal no período
                                </p>
                            </div>

                            {loading ? (
                                <div className="flex flex-col gap-4 p-5">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
                                        </div>
                                    ))}
                                </div>
                            ) : !channels?.channels.length ? (
                                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground p-5">
                                    Nenhum canal configurado
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 p-5">
                                    {channels.channels.map((ch) => (
                                        <div key={ch.id} className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium truncate max-w-[70%]">{ch.name}</span>
                                                <span className="text-sm font-semibold tabular-nums">{ch.messages}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-violet-500 transition-all"
                                                    style={{ width: `${(ch.messages / maxChannelMsg) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[11px] text-muted-foreground capitalize">{ch.type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ── Gráfico de barras por agente ── */}
                {!loading && agents && agents.agents.length > 0 && (
                    <section>
                        <div className="rounded-xl border bg-card p-5">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold">Comparativo de agentes</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Mensagens enviadas vs conversas resolvidas
                                </p>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    data={agents.agents.map((a) => ({
                                        name: a.name.split(' ')[0],
                                        'Msgs enviadas': a.messagesSent,
                                        'Resolvidas': a.resolvedContacts,
                                        'Atribuídos': a.assignedContacts,
                                    }))}
                                    margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                                    barGap={2}
                                    barCategoryGap="30%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Legend
                                        iconType="square"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                                    />
                                    <Bar dataKey="Msgs enviadas" fill="#10b981" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Resolvidas"    fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Atribuídos"   fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

            </div>
        </div>
    )
}
