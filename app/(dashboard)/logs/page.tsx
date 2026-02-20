'use client'

import { useState, useEffect } from 'react'
import {
    Calendar, CheckCircle2, Clock, Sparkles,
    GitCommit, Zap, Bug, Plus, TrendingUp,
    ListTodo, Info, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type LogType = 'feature' | 'improvement' | 'bugfix' | 'update' | 'upcoming'

type LogEntry = {
    id: string
    date: string
    version?: string
    type: LogType
    title: string
    summary: string
    details: string[]
    aiGenerated: boolean
}

// ─── Dados de Exemplo ─────────────────────────────────────────────────────────

const mockLogs: LogEntry[] = [
    {
        id: '1',
        date: '2024-02-20',
        version: '1.2.0',
        type: 'feature',
        title: 'Dark Mode Completo Implementado',
        summary: 'Sistema de dark mode completo com suporte para todas as páginas, imagens adaptadas e persistência automática no localStorage.',
        details: [
            '✅ ThemeProvider configurado com next-themes',
            '✅ Toggle de tema na sidebar (Light/Dark/System)',
            '✅ Filtros CSS para logos e imagens em dark mode',
            '✅ Suporte multi-tenant para desenvolvimento',
            '✅ Todas as páginas adaptadas (Auth, Dashboard, Settings, Conversations)',
            '✅ Persistência automática com localStorage'
        ],
        aiGenerated: true
    },
    {
        id: '2',
        date: '2024-02-19',
        version: '1.1.5',
        type: 'improvement',
        title: 'Melhorias no Sistema Multi-Tenant',
        summary: 'Adicionado suporte para desenvolvimento local com detecção automática de organização.',
        details: [
            'Modo desenvolvimento para localhost',
            'Busca automática por organização "Dev" ou "Desenvolvimento"',
            'Variável DEV_ORGANIZATION_ID no .env',
            'Logs detalhados para debug multi-tenant'
        ],
        aiGenerated: false
    },
    {
        id: '3',
        date: '2024-02-18',
        version: '1.1.0',
        type: 'feature',
        title: 'Sistema de Conversas Aprimorado',
        summary: 'Interface de conversas com suporte a múltiplos canais, tags e atribuição de responsáveis.',
        details: [
            'Filtros por canal e tag',
            'Sistema de atribuição de conversas',
            'Status de conversas (Abertas, Resolvidas, Pendentes)',
            'Visualização de mídia inline',
            'Notificações em tempo real via SSE'
        ],
        aiGenerated: false
    }
]

const upcomingFeatures: LogEntry[] = [
    {
        id: 'u1',
        date: 'Em breve',
        type: 'upcoming',
        title: 'Sistema de Kanban para Conversas',
        summary: 'Visualização em kanban para gerenciar conversas por status, com drag & drop.',
        details: [
            'Colunas customizáveis por status',
            'Drag & drop para mover conversas',
            'Filtros avançados',
            'Métricas em tempo real'
        ],
        aiGenerated: true
    },
    {
        id: 'u2',
        date: 'Planejado',
        type: 'upcoming',
        title: 'Integração com WhatsApp Business API',
        summary: 'Suporte oficial para WhatsApp Business API com templates e botões interativos.',
        details: [
            'Templates de mensagem aprovados',
            'Botões interativos',
            'Listas de seleção',
            'Métricas de entrega e leitura'
        ],
        aiGenerated: true
    }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeIcon(type: LogType) {
    switch (type) {
        case 'feature': return <Plus className="h-4 w-4" />
        case 'improvement': return <TrendingUp className="h-4 w-4" />
        case 'bugfix': return <Bug className="h-4 w-4" />
        case 'update': return <Zap className="h-4 w-4" />
        case 'upcoming': return <Clock className="h-4 w-4" />
        default: return <Info className="h-4 w-4" />
    }
}

function getTypeBadge(type: LogType) {
    const variants: Record<LogType, { label: string; className: string }> = {
        feature: { label: 'Nova Feature', className: 'bg-green-500/10 text-green-500 dark:bg-green-500/20' },
        improvement: { label: 'Melhoria', className: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20' },
        bugfix: { label: 'Correção', className: 'bg-red-500/10 text-red-500 dark:bg-red-500/20' },
        update: { label: 'Atualização', className: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20' },
        upcoming: { label: 'Em Breve', className: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20' }
    }
    const variant = variants[type]
    return (
        <Badge variant="secondary" className={cn('gap-1.5', variant.className)}>
            {getTypeIcon(type)}
            {variant.label}
        </Badge>
    )
}

function formatDate(dateStr: string) {
    if (dateStr === 'Em breve' || dateStr === 'Planejado') return dateStr
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// ─── Componente LogEntry ──────────────────────────────────────────────────────

function LogEntryCard({ log, isLast }: { log: LogEntry; isLast: boolean }) {
    return (
        <div className="relative pb-8">
            {/* Linha vertical da timeline */}
            {!isLast && (
                <span
                    className="absolute left-[13px] top-10 -ml-px h-full w-0.5 bg-border"
                    aria-hidden="true"
                />
            )}

            <div className="relative flex items-start gap-4">
                {/* Círculo da timeline */}
                <div className={cn(
                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                    log.type === 'upcoming' ? 'border-amber-500/50' : 'border-primary'
                )}>
                    {getTypeIcon(log.type)}
                </div>

                {/* Card de conteúdo */}
                <Card className="flex-1 dark-mode-image-subtle">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {log.version && (
                                        <Badge variant="outline" className="font-mono text-xs">
                                            v{log.version}
                                        </Badge>
                                    )}
                                    {getTypeBadge(log.type)}
                                    {log.aiGenerated && (
                                        <Badge variant="secondary" className="gap-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400">
                                            <Sparkles className="h-3 w-3" />
                                            Resumo IA
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-lg">{log.title}</CardTitle>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(log.date)}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {log.summary}
                        </p>

                        {log.details.length > 0 && (
                            <div className="space-y-2">
                                <Separator />
                                <div className="space-y-1.5">
                                    {log.details.map((detail, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                            <GitCommit className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                            <span className="text-muted-foreground">{detail}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>(mockLogs)
    const [upcoming, setUpcoming] = useState<LogEntry[]>(upcomingFeatures)

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Header */}
            <header className="shrink-0 border-b bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <ListTodo className="h-6 w-6" />
                            Changelog & Atualizações
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Acompanhe todas as novidades, melhorias e o que está por vir
                        </p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="container max-w-4xl py-6 px-6">
                    <Tabs defaultValue="recent" className="space-y-6">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="recent" className="gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Recentes
                            </TabsTrigger>
                            <TabsTrigger value="upcoming" className="gap-2">
                                <Clock className="h-4 w-4" />
                                Em Breve
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab: Atualizações Recentes */}
                        <TabsContent value="recent" className="space-y-0">
                            {logs.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">
                                            Nenhuma atualização registrada ainda.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-0">
                                    {logs.map((log, idx) => (
                                        <LogEntryCard
                                            key={log.id}
                                            log={log}
                                            isLast={idx === logs.length - 1}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab: Próximas Features */}
                        <TabsContent value="upcoming" className="space-y-0">
                            {upcoming.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">
                                            Nenhuma feature planejada no momento.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-0">
                                    {upcoming.map((log, idx) => (
                                        <LogEntryCard
                                            key={log.id}
                                            log={log}
                                            isLast={idx === upcoming.length - 1}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
