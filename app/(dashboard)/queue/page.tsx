'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Clock, Zap, Loader2, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed'

type Job = {
    id: string
    name: string
    data: Record<string, unknown>
    progress: number | Record<string, unknown>
    attemptsMade: number
    timestamp: number
    processedOn?: number
    finishedOn?: number
    failedReason?: string
    returnvalue?: Record<string, unknown>
}

type QueueStats = {
    name: string
    label: string
    counts: Record<string, number>
    waiting: Job[]
    active: Job[]
    failed: Job[]
    completed: Job[]
}

type StatsResponse = {
    messageQueue: QueueStats
    syncQueue: QueueStats
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number) {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatTs(ts?: number) {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function jobDuration(job: Job) {
    if (!job.processedOn || !job.finishedOn) return null
    return formatDuration(job.finishedOn - job.processedOn)
}

function jobDataPreview(data: Record<string, unknown>) {
    const parts: string[] = []
    if (data.channelName) parts.push(`canal: ${data.channelName}`)
    if (data.orgId) parts.push(`org: ${String(data.orgId).slice(0, 8)}…`)
    if (data.contactId) parts.push(`contato: ${String(data.contactId).slice(0, 8)}…`)
    const key = data.key as { remoteJid?: string } | undefined
    if (key?.remoteJid) parts.push(key.remoteJid.split('@')[0])
    return parts.join(' · ') || JSON.stringify(data).slice(0, 60)
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={cn('flex items-center gap-3 rounded-lg border p-4', color)}>
            <div className="shrink-0">{icon}</div>
            <div>
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    )
}

function JobRow({ job, onRetry, onRemove }: { job: Job; status: JobStatus; onRetry: (id: string) => void; onRemove: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false)
    const duration = jobDuration(job)

    return (
        <>
            <tr
                className="border-b text-xs hover:bg-muted/30 cursor-pointer"
                onClick={() => setExpanded((v) => !v)}
            >
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{String(job.id).slice(-8)}</td>
                <td className="px-3 py-2 font-medium">{job.name}</td>
                <td className="px-3 py-2 max-w-[220px] truncate text-muted-foreground">{jobDataPreview(job.data)}</td>
                <td className="px-3 py-2 tabular-nums">{typeof job.progress === 'number' ? `${job.progress}%` : '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatTs(job.timestamp)}</td>
                <td className="px-3 py-2 text-muted-foreground">{duration ?? '—'}</td>
                <td className="px-3 py-2">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {job.failedReason && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRetry(job.id)} title="Tentar novamente">
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onRemove(job.id)} title="Remover">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr className="border-b bg-muted/20">
                    <td colSpan={7} className="px-4 py-3">
                        <div className="space-y-2 text-xs">
                            {job.failedReason && (
                                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 font-mono text-[11px]">
                                    {job.failedReason}
                                </div>
                            )}
                            {job.returnvalue && (
                                <div className="rounded border bg-background px-3 py-2 font-mono text-[11px]">
                                    {JSON.stringify(job.returnvalue, null, 2)}
                                </div>
                            )}
                            <div className="rounded border bg-background px-3 py-2 font-mono text-[11px]">
                                {JSON.stringify(job.data, null, 2)}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

function QueueSection({ queue, onRetry, onRemove }: { queue: QueueStats; onRetry: (id: string) => void; onRemove: (id: string) => void }) {
    // Auto-seleciona o tab com jobs: active → waiting → failed → completed
    const defaultTab: JobStatus =
        (queue.counts.active   ?? 0) > 0 ? 'active'    :
        (queue.counts.waiting  ?? 0) > 0 ? 'waiting'   :
        (queue.counts.failed   ?? 0) > 0 ? 'failed'    :
        'completed'
    const [activeTab, setActiveTab] = useState<JobStatus>(defaultTab)

    const jobsMap: Record<JobStatus, Job[]> = {
        active:    queue.active,
        waiting:   queue.waiting,
        failed:    queue.failed,
        completed: queue.completed,
    }

    const tabs: { key: JobStatus; label: string; color: string }[] = [
        { key: 'active',    label: 'Processando', color: 'text-blue-600' },
        { key: 'waiting',   label: 'Aguardando',  color: 'text-yellow-600' },
        { key: 'failed',    label: 'Com falha',   color: 'text-red-600' },
        { key: 'completed', label: 'Concluídos',  color: 'text-green-600' },
    ]

    const currentJobs = jobsMap[activeTab]

    return (
        <div className="rounded-lg border">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                    <h3 className="font-semibold text-sm">{queue.label}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{queue.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <StatCard label="Aguardando"  value={queue.counts.waiting  ?? 0} icon={<Clock  className="h-4 w-4 text-yellow-500" />} color="" />
                    <StatCard label="Processando" value={queue.counts.active   ?? 0} icon={<Zap    className="h-4 w-4 text-blue-500"   />} color="" />
                    <StatCard label="Concluídos"  value={queue.counts.completed ?? 0} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} color="" />
                    <StatCard label="Com falha"   value={queue.counts.failed   ?? 0} icon={<XCircle className="h-4 w-4 text-red-500"   />} color="" />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b px-4 pt-2">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors',
                            activeTab === t.key
                                ? `border-primary ${t.color}`
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t.label}
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                            {jobsMap[t.key].length}
                        </Badge>
                    </button>
                ))}
            </div>

            {/* Jobs table */}
            {currentJobs.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    Nenhum job nesta categoria
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-[11px] text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">ID</th>
                                <th className="px-3 py-2 text-left font-medium">Nome</th>
                                <th className="px-3 py-2 text-left font-medium">Dados</th>
                                <th className="px-3 py-2 text-left font-medium">Progresso</th>
                                <th className="px-3 py-2 text-left font-medium">Criado</th>
                                <th className="px-3 py-2 text-left font-medium">Duração</th>
                                <th className="px-3 py-2 text-left font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentJobs.map((job) => (
                                <JobRow
                                    key={job.id}
                                    job={job}
                                    status={activeTab}
                                    onRetry={onRetry}
                                    onRemove={onRemove}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function QueuePage() {
    const [stats, setStats] = useState<StatsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/queue/stats')
            setStats(data)
            setError(null)
            setLastUpdate(new Date())
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            setError(msg ?? 'Erro ao carregar estatísticas.')
        } finally {
            setLoading(false)
        }
    }, [])

    // Carrega inicial + auto-refresh a cada 4 s
    useEffect(() => {
        fetchStats()
        if (!autoRefresh) return
        const timer = setInterval(fetchStats, 4000)
        return () => clearInterval(timer)
    }, [fetchStats, autoRefresh])

    async function handleRetry(jobId: string) {
        try {
            await api.post(`/queue/jobs/${jobId}/retry`)
            toast.success('Job reenfileirado.')
            fetchStats()
        } catch {
            toast.error('Erro ao tentar reprocessar job.')
        }
    }

    async function handleRemove(jobId: string) {
        try {
            await api.delete(`/queue/jobs/${jobId}`)
            toast.success('Job removido.')
            fetchStats()
        } catch {
            toast.error('Erro ao remover job.')
        }
    }

    const totalWaiting   = (stats?.messageQueue.counts.waiting  ?? 0) + (stats?.syncQueue.counts.waiting  ?? 0)
    const totalActive    = (stats?.messageQueue.counts.active   ?? 0) + (stats?.syncQueue.counts.active   ?? 0)
    const totalCompleted = (stats?.messageQueue.counts.completed ?? 0) + (stats?.syncQueue.counts.completed ?? 0)
    const totalFailed    = (stats?.messageQueue.counts.failed   ?? 0) + (stats?.syncQueue.counts.failed   ?? 0)

    return (
        <div className="flex flex-1 flex-col overflow-auto">
            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Monitor de Filas</h1>
                        <p className="text-sm text-muted-foreground">
                            BullMQ · Redis · {lastUpdate ? `atualizado às ${lastUpdate.toLocaleTimeString('pt-BR')}` : 'carregando…'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh((v) => !v)}
                            className={cn(autoRefresh && 'border-primary text-primary')}
                        >
                            {autoRefresh ? <Zap className="mr-1.5 h-3.5 w-3.5" /> : <Zap className="mr-1.5 h-3.5 w-3.5 opacity-40" />}
                            Auto-refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
                            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Global stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard label="Aguardando"  value={totalWaiting}   icon={<Clock       className="h-5 w-5 text-yellow-500" />} color="border-yellow-200 bg-yellow-50/50" />
                    <StatCard label="Processando" value={totalActive}    icon={<Zap         className="h-5 w-5 text-blue-500"   />} color="border-blue-200 bg-blue-50/50"   />
                    <StatCard label="Concluídos"  value={totalCompleted} icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} color="border-green-200 bg-green-50/50"  />
                    <StatCard label="Com falha"   value={totalFailed}    icon={<XCircle     className="h-5 w-5 text-red-500"   />} color="border-red-200 bg-red-50/50"     />
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Queues */}
                {!loading && stats && (
                    <div className="flex flex-col gap-6">
                        <QueueSection queue={stats.messageQueue} onRetry={handleRetry} onRemove={handleRemove} />
                        <QueueSection queue={stats.syncQueue}    onRetry={handleRetry} onRemove={handleRemove} />
                    </div>
                )}
            </div>
        </div>
    )
}
