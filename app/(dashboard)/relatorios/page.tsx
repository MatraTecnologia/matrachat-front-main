'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    FileBarChart2,
    Send,
    MessageSquare,
    Users,
    CheckCircle2,
    Activity,
    Download,
    RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'
import { cn } from '@/lib/utils'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { subDays } from 'date-fns'

// ── Tipos ──────────────────────────────────────────────────────────────────

type AgentOption = {
    userId: string
    name: string
    email: string
    image: string | null
    role: string
}

type ReportData = {
    agent: AgentOption
    period: { start: string; end: string }
    metrics: {
        messagesSent: number
        messagesReceived: number
        contactsHandled: number
        contactsResolved: number
        activeConversations: number
    }
    timeline: Array<{ day: string; sent: number; received: number }>
    contacts: Array<{
        id: string
        name: string
        phone: string | null
        convStatus: string
        lastMessageAt: string | null
        messageCount: number
    }>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDay(iso: string) {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
}

function statusLabel(s: string) {
    if (s === 'open') return { label: 'Aberta', color: 'text-blue-500' }
    if (s === 'pending') return { label: 'Pendente', color: 'text-yellow-500' }
    return { label: 'Resolvida', color: 'text-green-500' }
}

function roleLabel(r: string) {
    if (r === 'owner') return 'Proprietário'
    if (r === 'admin') return 'Administrador'
    return 'Membro'
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
    icon: Icon,
    color,
    label,
    value,
    loading,
}: {
    icon: React.ElementType
    color: string
    label: string
    value: number | undefined
    loading: boolean
}) {
    return (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color)}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                {loading ? (
                    <div className="mt-1 h-6 w-16 animate-pulse rounded bg-muted" />
                ) : (
                    <p className="text-2xl font-bold tabular-nums">{value?.toLocaleString('pt-BR') ?? '—'}</p>
                )}
            </div>
        </div>
    )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
    const { data: permissions } = usePermissions()

    const today = new Date().toISOString().slice(0, 10)
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString().slice(0, 10)

    const [agents, setAgents] = useState<AgentOption[]>([])
    const [selectedAgentId, setSelectedAgentId] = useState('')
    const [startDate, setStartDate] = useState(thirtyDaysAgo)
    const [endDate, setEndDate] = useState(today)

    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [hasGenerated, setHasGenerated] = useState(false)

    const reportRef = useRef<HTMLDivElement>(null)

    // Carrega lista de agentes a partir do endpoint existente de relatórios
    useEffect(() => {
        api.get('/reports/agents', { params: { period: '30d' } })
            .then((res) => {
                const list: AgentOption[] = res.data.agents ?? []
                setAgents(list)
                if (list.length > 0) setSelectedAgentId(list[0].userId)
            })
            .catch(() => {})
    }, [])

    const generateReport = useCallback(async () => {
        if (!selectedAgentId || !startDate || !endDate) return
        setLoading(true)
        setHasGenerated(true)
        setData(null)
        try {
            const res = await api.get('/reports/agent-detail', {
                params: { agentId: selectedAgentId, startDate, endDate },
            })
            setData(res.data)
        } catch {
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [selectedAgentId, startDate, endDate])

    const exportPdf = async () => {
        if (!reportRef.current || !data) return
        setExporting(true)
        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ])

            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })

            const pageW = pdf.internal.pageSize.getWidth()
            const pageH = pdf.internal.pageSize.getHeight()
            const ratio = pageW / canvas.width
            const scaledH = canvas.height * ratio

            let heightLeft = scaledH
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, pageW, scaledH)
            heightLeft -= pageH

            while (heightLeft > 0) {
                position -= pageH
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, pageW, scaledH)
                heightLeft -= pageH
            }

            const agentSlug = data.agent.name.toLowerCase().replace(/\s+/g, '-')
            pdf.save(`relatorio-${agentSlug}-${startDate}_${endDate}.pdf`)
        } catch (err) {
            console.error('Erro ao gerar PDF:', err)
        } finally {
            setExporting(false)
        }
    }

    if (permissions && permissions.permissions.canViewDashboard === false) {
        return <NoPermission />
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Relatório de Agente</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Analise o desempenho individual por período e exporte em PDF
                        </p>
                    </div>
                    {hasGenerated && data && (
                        <button
                            onClick={exportPdf}
                            disabled={exporting || loading}
                            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
                        </button>
                    )}
                </div>

                {/* Filtros */}
                <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-52">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Agente
                        </label>
                        <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {agents.length === 0 && (
                                <option value="">Carregando agentes...</option>
                            )}
                            {agents.map((a) => (
                                <option key={a.userId} value={a.userId}>
                                    {a.name} — {a.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Data inicial
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            max={endDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Data final
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            max={today}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <button
                        onClick={generateReport}
                        disabled={loading || !selectedAgentId}
                        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                        {loading ? 'Gerando...' : 'Gerar Relatório'}
                    </button>
                </div>

                {/* Estado inicial */}
                {!hasGenerated && (
                    <div className="rounded-xl border bg-card p-16 text-center">
                        <FileBarChart2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-base font-medium text-muted-foreground">
                            Selecione um agente e o período
                        </p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            Clique em &quot;Gerar Relatório&quot; para visualizar os dados
                        </p>
                    </div>
                )}

                {/* Conteúdo do relatório — capturado pelo jsPDF */}
                {hasGenerated && (
                    <div ref={reportRef} className="space-y-6 bg-background">

                        {/* Cabeçalho do agente */}
                        {loading ? (
                            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                                <div className="h-12 w-12 animate-pulse rounded-full bg-muted shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                                    <div className="h-3 w-56 animate-pulse rounded bg-muted" />
                                </div>
                            </div>
                        ) : data && (
                            <div className="rounded-xl border bg-card p-4 flex items-center gap-4 flex-wrap">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base overflow-hidden">
                                    {data.agent.image ? (
                                        <img
                                            src={data.agent.image}
                                            alt={data.agent.name}
                                            className="h-12 w-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        data.agent.name
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold">{data.agent.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {data.agent.email} · {roleLabel(data.agent.role)}
                                    </p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-xs text-muted-foreground">Período do relatório</p>
                                    <p className="text-sm font-medium">
                                        {fmtDate(data.period.start)} – {fmtDate(data.period.end)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                            <KpiCard
                                icon={Send}
                                color="bg-blue-500/10 text-blue-500"
                                label="Msgs enviadas"
                                value={data?.metrics.messagesSent}
                                loading={loading}
                            />
                            <KpiCard
                                icon={MessageSquare}
                                color="bg-purple-500/10 text-purple-500"
                                label="Msgs recebidas"
                                value={data?.metrics.messagesReceived}
                                loading={loading}
                            />
                            <KpiCard
                                icon={Users}
                                color="bg-orange-500/10 text-orange-500"
                                label="Contatos atendidos"
                                value={data?.metrics.contactsHandled}
                                loading={loading}
                            />
                            <KpiCard
                                icon={CheckCircle2}
                                color="bg-green-500/10 text-green-500"
                                label="Resolvidos"
                                value={data?.metrics.contactsResolved}
                                loading={loading}
                            />
                            <KpiCard
                                icon={Activity}
                                color="bg-yellow-500/10 text-yellow-500"
                                label="Conversas ativas"
                                value={data?.metrics.activeConversations}
                                loading={loading}
                            />
                        </div>

                        {/* Timeline */}
                        <div className="rounded-xl border bg-card p-4">
                            <h2 className="text-sm font-medium mb-4">Volume de mensagens por dia</h2>
                            {loading ? (
                                <div className="h-52 animate-pulse rounded bg-muted" />
                            ) : data && data.timeline.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart
                                        data={data.timeline}
                                        margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                        <XAxis
                                            dataKey="day"
                                            tickFormatter={fmtDay}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            labelFormatter={(v) => fmtDay(String(v))}
                                            formatter={(value, name) => [
                                                value,
                                                name === 'sent' ? 'Enviadas' : 'Recebidas',
                                            ]}
                                        />
                                        <Legend
                                            formatter={(v) => (v === 'sent' ? 'Enviadas' : 'Recebidas')}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sent"
                                            stroke="#3b82f6"
                                            fill="url(#gradSent)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="received"
                                            stroke="#a855f7"
                                            fill="url(#gradReceived)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : !loading ? (
                                <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                                    Sem dados no período selecionado
                                </div>
                            ) : null}
                        </div>

                        {/* Tabela de contatos */}
                        {!loading && data && data.contacts.length > 0 && (
                            <div className="rounded-xl border bg-card overflow-hidden">
                                <div className="p-4 border-b">
                                    <h2 className="text-sm font-medium">
                                        Contatos atendidos{' '}
                                        <span className="text-muted-foreground font-normal">
                                            ({data.contacts.length})
                                        </span>
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                                    Nome
                                                </th>
                                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                                    Telefone
                                                </th>
                                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                                    Status
                                                </th>
                                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                                    Última mensagem
                                                </th>
                                                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                                    Mensagens
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {data.contacts.map((c) => {
                                                const st = statusLabel(c.convStatus)
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        className="hover:bg-muted/30 transition-colors"
                                                    >
                                                        <td className="px-4 py-2.5 font-medium">
                                                            {c.name || '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">
                                                            {c.phone || '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span
                                                                className={cn(
                                                                    'text-xs font-medium',
                                                                    st.color,
                                                                )}
                                                            >
                                                                {st.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">
                                                            {c.lastMessageAt
                                                                ? fmtDate(c.lastMessageAt)
                                                                : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums">
                                                            {c.messageCount}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Empty state após gerar */}
                        {!loading && data && data.contacts.length === 0 && (
                            <div className="rounded-xl border bg-card p-12 text-center">
                                <FileBarChart2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Nenhum contato atendido neste período
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
