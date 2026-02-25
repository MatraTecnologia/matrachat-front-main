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

// ─── Dados Reais do Changelog ──────────────────────────────────────────────────

const mockLogs: LogEntry[] = [
    {
        id: '8',
        date: '2026-02-24',
        version: '2.5.0',
        type: 'feature',
        title: 'Sistema de Presença em Tempo Real',
        summary: 'Rastreamento completo de usuários online via Socket.io com suporte a supervisão de tela, status (online/away/offline) e eventos globais de navegação.',
        details: [
            'Status online/away/offline por usuário e organização',
            'Supervisão de conversa: texto digitado, scroll e ações em tempo real',
            'Eventos globais: página visitada, cliques, inputs e scroll',
            'Dois mapas internos: presenceMap (org→usuário) e socketMap (socket→usuário)',
            'Integração no layout do dashboard via Socket.io'
        ],
        aiGenerated: true
    },
    {
        id: '7',
        date: '2026-02-24',
        version: '2.4.0',
        type: 'feature',
        title: 'Filas Assíncronas com BullMQ + Redis',
        summary: 'Processamento de mensagens recebidas via webhook movido para filas assíncronas com BullMQ e Redis, garantindo confiabilidade e suporte a retentativas.',
        details: [
            'Conexão Redis centralizada via variável REDIS_URL',
            'Fila webhook-messages para Evolution API e WhatsApp Business API',
            'Deduplicação automática por externalId (evita mensagem duplicada)',
            'Workers separados: messageWorker e syncWorker',
            'Página de monitoramento das filas no dashboard (apenas admin/owner)'
        ],
        aiGenerated: true
    },
    {
        id: '6',
        date: '2026-02-24',
        version: '2.3.0',
        type: 'feature',
        title: 'Times de Agentes',
        summary: 'Novo módulo de times de atendimento com CRUD completo no backend e suporte a atribuição de contatos por time.',
        details: [
            'Model Team: id, organizationId, name, description, color',
            'Model TeamMember: vínculo entre times e membros',
            'Campo teamId adicionado ao model Contact',
            'Rotas GET/POST/PATCH/DELETE /teams com listagem de membros',
            'Eventos SSE conv_updated incluem teamId e teamName'
        ],
        aiGenerated: true
    },
    {
        id: '5',
        date: '2026-02-24',
        version: '2.2.0',
        type: 'feature',
        title: 'Tab "Sem Canal" nas Conversas',
        summary: 'Contatos sem canal vinculado agora ficam em uma seção exclusiva visível apenas para admin/owner, com dupla camada de segurança no backend e frontend.',
        details: [
            'Novo endpoint GET /contacts/no-channel (retorna 403 para não-admin)',
            'Endpoint GET /contacts filtra automaticamente sem-canal para membros comuns',
            'Nova tab "# Sem Canal" no painel de conversas (admin/owner only)',
            'Badge com contagem de contatos sem canal em tempo real',
            'Filtro inteligente: fonte de dados alternada conforme tab ativa'
        ],
        aiGenerated: true
    },
    {
        id: '4',
        date: '2026-02-23',
        version: '2.1.1',
        type: 'bugfix',
        title: 'Correção do OAuth Facebook (Desktop → Web App)',
        summary: 'Resolvido erro "The request is invalid because the app is configured as a desktop app" que impedia a autenticação OAuth do Facebook/WhatsApp Business.',
        details: [
            'App Meta configurado como Web App (não Desktop)',
            'URI de redirecionamento OAuth validado no painel Meta',
            'Callback configurado em /facebook-oauth/callback',
            'Guia de resolução documentado em RESOLVER-ERRO-OAUTH-FACEBOOK.md'
        ],
        aiGenerated: false
    },
    {
        id: '3',
        date: '2026-02-23',
        version: '2.1.0',
        type: 'update',
        title: 'Páginas de Termos e Política de Privacidade',
        summary: 'Adicionadas páginas públicas de Termos de Uso e Política de Privacidade, necessárias para o processo de aprovação do App Meta.',
        details: [
            'Página /terms — Termos de Uso',
            'Página /privacy — Política de Privacidade',
            'URLs configuradas no App Meta para aprovação de permissões'
        ],
        aiGenerated: false
    },
    {
        id: '2',
        date: '2026-02-20',
        version: '2.0.0',
        type: 'feature',
        title: 'WhatsApp Business API (Meta) + Engine de Atribuição',
        summary: 'Suporte completo à WhatsApp Business API oficial do Meta com processamento de webhooks e engine de atribuição automática de contatos a agentes.',
        details: [
            'Recebimento e processamento de mensagens via webhook Meta',
            'Criação automática de contato na primeira mensagem recebida',
            'Engine de atribuição: regras configuráveis por organização',
            'Email templates e templates presets para campanhas',
            'Rotas de relatórios e copilot (IA assistente) implementadas'
        ],
        aiGenerated: true
    },
    {
        id: '1',
        date: '2026-02-19',
        version: '1.0.0',
        type: 'feature',
        title: 'Lançamento da Plataforma MatraChat',
        summary: 'Versão inicial da plataforma com multi-tenant, canais de atendimento, sistema de conversas, campanhas e copilot de IA.',
        details: [
            'Multi-tenant com organizações isoladas (Better Auth)',
            'Canais: WhatsApp (Evolution API), Facebook, API genérica',
            'Sistema de conversas com tags, atribuição e status',
            'Campanhas de mensagens em massa',
            'Copilot com IA para sugestão de respostas',
            'Notificações em tempo real via SSE + Socket.io'
        ],
        aiGenerated: false
    }
]

const upcomingFeatures: LogEntry[] = [
    {
        id: 'u1',
        date: 'Em breve',
        type: 'upcoming',
        title: 'Supervisão de Agentes em Tempo Real',
        summary: 'Painel para supervisores acompanharem o que cada agente está fazendo em tempo real: conversa ativa, texto sendo digitado e histórico de ações.',
        details: [
            'Visualização de conversa ativa por agente',
            'Texto digitado em tempo real (screen sharing)',
            'Histórico de ações e navegação do agente',
            'Filtro por time e status (online/away/offline)'
        ],
        aiGenerated: true
    },
    {
        id: 'u2',
        date: 'Em breve',
        type: 'upcoming',
        title: 'Atribuição Automática por Time',
        summary: 'Regras de atribuição que direcionam novos contatos automaticamente para o time correto com base em canal, horário ou palavra-chave.',
        details: [
            'Regras por canal de origem',
            'Distribuição round-robin dentro do time',
            'Prioridade por disponibilidade (online first)',
            'Histórico de atribuições automáticas'
        ],
        aiGenerated: true
    },
    {
        id: 'u3',
        date: 'Planejado',
        type: 'upcoming',
        title: 'Relatórios Avançados de Atendimento',
        summary: 'Dashboard de métricas com TMA (tempo médio de atendimento), TME (tempo médio de espera), volume por canal e desempenho por agente.',
        details: [
            'TMA e TME por agente e por time',
            'Volume de atendimentos por canal e período',
            'Taxa de resolução no primeiro contato',
            'Exportação em CSV e PDF'
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
